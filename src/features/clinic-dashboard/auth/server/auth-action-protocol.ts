import "server-only"

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import type { ClinicDashboardEmailFlow } from "../model/auth"
import { websiteAuthFlow, type CompletionAttempt, type CompletionGrant } from "./callback"

const keysSchema = z
  .object({
    environment: z.enum(["local", "test", "preview", "production"]),
    service: z
      .array(
        z
          .object({
            version: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
            secret: z.string().min(32),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
const outcomes = {
  requestRecovery: "accepted",
  validateAction: "valid",
  confirmAction: "confirmed",
  completeAction: "completed",
} as const
type Operation = keyof typeof outcomes
type Envelope = Readonly<{ requestId: string; timestamp: string; keyVersion: string }>
type PreparedRequest = Readonly<{ operation: Operation; body: string; envelope: Envelope }>
const successSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(true),
    outcome: z.enum(["accepted", "valid", "confirmed", "completed"]),
  })
  .strict()
const invalidSchema = z
  .object({
    version: z.literal(1),
    ok: z.literal(false),
    code: z.literal("INVALID_OR_EXPIRED_ACTION"),
  })
  .strict()

function configuration() {
  const environment = validateEnvironment()
  const keys = keysSchema.parse(JSON.parse(environment.AUTH_ACTION_PROTOCOL_SERVICE_KEYS_JSON ?? ""))
  const expected =
    environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "production"
      ? environment.VERCEL_ENV
      : environment.NODE_ENV === "test"
        ? "test"
        : "local"
  const origin = new URL(environment.PAYLOAD_API_URL)
  if (
    keys.environment !== expected ||
    new Set(keys.service.map((key) => key.version)).size !== keys.service.length ||
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("Auth-action protocol unavailable")
  }
  return { keys, origin }
}

function prepare(operation: Operation, input: Record<string, string>, envelope?: Envelope): PreparedRequest {
  const { keys } = configuration()
  const body = JSON.stringify(input)
  if (Buffer.byteLength(body, "utf8") > 16_384) throw new Error("Auth-action protocol unavailable")
  return {
    operation,
    body,
    envelope: envelope ?? {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      keyVersion: keys.service[0]!.version,
    },
  }
}

async function readResponse(response: Response): Promise<unknown> {
  if (!response.body) throw new Error()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 2048) throw new Error()
      chunks.push(chunk.value)
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown
  } catch (error) {
    void reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}

async function sendPrepared(request: PreparedRequest) {
  try {
    const { keys, origin } = configuration()
    const {
      body,
      operation,
      envelope: { timestamp, requestId, keyVersion },
    } = request
    const age = Date.now() - Date.parse(timestamp)
    const key = keys.service.find((key) => key.version === keyVersion)
    if (!key || !Number.isFinite(age) || age < 0 || age >= 300_000) return "unavailable" as const
    const signature = createHmac("sha256", key.secret)
      .update(
        JSON.stringify([
          "auth-action-protocol-v1",
          keys.environment,
          "POST",
          operation,
          timestamp,
          requestId,
          createHash("sha256").update(body, "utf8").digest("hex"),
        ]),
        "utf8",
      )
      .digest("hex")
    const response = await fetch(new URL(`/api/internal/auth-actions/v1/${operation}`, origin), {
      body,
      cache: "no-store",
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "x-auth-action-timestamp": timestamp,
        "x-auth-action-request-id": requestId,
        "x-auth-action-key-version": keyVersion,
        "x-auth-action-signature": signature,
      },
    })
    const bodyResult = await readResponse(response)
    const result = successSchema.safeParse(bodyResult)
    if (
      result.success &&
      response.status === (operation === "requestRecovery" ? 202 : 200) &&
      result.data.outcome === outcomes[operation]
    )
      return result.data.outcome
    if (response.status === 400 && invalidSchema.safeParse(bodyResult).success) return "invalid" as const
    return "unavailable" as const
  } catch {
    return "unavailable" as const
  }
}

async function send(operation: Operation, input: Record<string, string>) {
  try {
    return await sendPrepared(prepare(operation, input))
  } catch {
    return "unavailable" as const
  }
}

export async function requestWebsiteRecovery(request: NextRequest, email: string) {
  if (process.env.VERCEL !== "1" || !["preview", "production"].includes(process.env.VERCEL_ENV ?? "")) return
  const clientIP = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (!clientIP || !isIP(clientIP) || clientIP.includes("%")) return
  await send("requestRecovery", { email, clientIP })
}

export async function validateWebsiteAction(actionRef: string, flow: ClinicDashboardEmailFlow) {
  if (isControlledAuthTestMode()) return actionRef === `controlled-${flow}-reference` ? "valid" : "invalid"
  return send("validateAction", { actionRef, flow: websiteAuthFlow(flow) })
}

export async function confirmWebsiteAction(
  actionRef: string,
  flow: ClinicDashboardEmailFlow,
  accessToken: string,
) {
  return send("confirmAction", { actionRef, flow: websiteAuthFlow(flow), accessToken })
}

function completionBinding(request: PreparedRequest) {
  const environment = validateEnvironment()
  return createHmac("sha256", environment.CSRF_SIGNING_SECRET)
    .update(
      JSON.stringify([
        "dashboard-password-request-binding-v1",
        environment.VERCEL_ENV ?? environment.NODE_ENV ?? "development",
        request.envelope,
        request.body,
      ]),
    )
    .digest("hex")
}

export function prepareWebsiteCompletion(grant: CompletionGrant, accessToken: string, password: string) {
  try {
    const request = prepare(
      "completeAction",
      {
        actionRef: grant.actionRef,
        flow: websiteAuthFlow(grant.flow),
        accessToken,
        password,
      },
      grant.attempt && {
        requestId: grant.attempt.requestId,
        timestamp: grant.attempt.timestamp,
        keyVersion: grant.attempt.keyVersion,
      },
    )
    const bodyBinding = completionBinding(request)
    if (
      grant.attempt &&
      !timingSafeEqual(Buffer.from(grant.attempt.bodyBinding, "hex"), Buffer.from(bodyBinding, "hex"))
    )
      return undefined
    const attempt: CompletionAttempt = { ...request.envelope, bodyBinding }
    return { attempt, complete: () => sendPrepared(request) }
  } catch {
    return undefined
  }
}
