import "server-only"
import { clinicDashboardContractHeaders } from "../../payload-contract"

import { validateEnvironment } from "@/lib/env"
import type {
  ClinicProfileDraftCreateInput,
  ClinicProfileDraftDiscardInput,
  ClinicProfileDraftSaveInput,
  ClinicProfilePublishInput,
  ClinicProfileSnapshot,
} from "../model/clinic-profile-source"
import { clinicProfileSourceSnapshotSchema } from "../model/clinic-profile-source-schema"
import type {
  ClinicProfileChangeError,
  ClinicProfileProvider,
  ClinicProfileProviderResult,
  ClinicProfileReadError,
} from "./clinic-profile-provider"

type PayloadResponse =
  | Readonly<{
      ok: true
      value: unknown
    }>
  | Readonly<{
      ok: false
      status?: number
    }>

function endpointFor(pathname: string) {
  return new URL(pathname, validateEnvironment().PAYLOAD_API_URL)
}

function requestHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...clinicDashboardContractHeaders(),
  }
}

function hasPrivatePayloadHeaders(response: Response) {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? ""
  const vary = response.headers.get("vary")?.toLowerCase() ?? ""
  return (
    cacheControl.includes("private") && cacheControl.includes("no-store") && vary.includes("authorization")
  )
}

async function requestPayloadJson(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<PayloadResponse> {
  try {
    const response = await fetcher(endpoint, init)
    if (!hasPrivatePayloadHeaders(response)) return { ok: false }
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch {
    return { ok: false }
  }
}

function readErrorForStatus(status: number | undefined): ClinicProfileReadError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  return "temporarily-unavailable"
}

function changeErrorForStatus(status: number | undefined): ClinicProfileChangeError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not-found"
  if (status === 400 || status === 422) return "invalid-input"
  if (status === 409) return "conflict"
  return "temporarily-unavailable"
}

function readInit(accessToken: string): RequestInit {
  return {
    cache: "no-store",
    headers: requestHeaders(accessToken),
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

function mutationInit(
  accessToken: string,
  method: "POST" | "PUT",
  body:
    | ClinicProfileDraftCreateInput
    | ClinicProfileDraftDiscardInput
    | ClinicProfileDraftSaveInput
    | ClinicProfilePublishInput,
): RequestInit {
  return {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      ...requestHeaders(accessToken),
      "Content-Type": "application/json",
    },
    method,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

export function createPayloadClinicProfileProvider(
  accessToken: string,
  clinicId: string,
  fetcher: typeof fetch = fetch,
): ClinicProfileProvider {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(clinicId)) throw new Error("Invalid profile clinic target")
  const endpoint = `/api/clinic-dashboard/clinics/${encodeURIComponent(clinicId)}/profile`
  const payloadClinicProfilePaths = {
    createDraft: `${endpoint}/draft`,
    discardDraft: `${endpoint}/draft/discard`,
    loadProfile: endpoint,
    publishDraft: `${endpoint}/publish`,
    saveDraft: `${endpoint}/draft`,
  }

  async function requestSnapshot<TError extends ClinicProfileReadError | ClinicProfileChangeError>(
    pathname: string,
    init: RequestInit,
    errorForStatus: (status: number | undefined) => TError,
  ): Promise<ClinicProfileProviderResult<ClinicProfileSnapshot, TError | "invalid-data">> {
    const response = await requestPayloadJson(endpointFor(pathname), init, fetcher)
    if (!response.ok) return { error: errorForStatus(response.status), ok: false } as const

    const parsed = clinicProfileSourceSnapshotSchema.safeParse(response.value)
    return parsed.success
      ? ({ ok: true, value: parsed.data } as const)
      : ({ error: "invalid-data", ok: false } as const)
  }

  return {
    createDraft: (input) =>
      requestSnapshot(
        payloadClinicProfilePaths.createDraft,
        mutationInit(accessToken, "POST", input),
        changeErrorForStatus,
      ),
    discardDraft: (input) =>
      requestSnapshot(
        payloadClinicProfilePaths.discardDraft,
        mutationInit(accessToken, "POST", input),
        changeErrorForStatus,
      ),
    loadSnapshot: () =>
      requestSnapshot(payloadClinicProfilePaths.loadProfile, readInit(accessToken), readErrorForStatus),
    publishDraft: (input) =>
      requestSnapshot(
        payloadClinicProfilePaths.publishDraft,
        mutationInit(accessToken, "POST", input),
        changeErrorForStatus,
      ),
    saveDraft: (input) =>
      requestSnapshot(
        payloadClinicProfilePaths.saveDraft,
        mutationInit(accessToken, "PUT", input),
        changeErrorForStatus,
      ),
  }
}
