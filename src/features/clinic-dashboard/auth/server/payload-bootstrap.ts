import "server-only"

import { isControlledAuthTestMode, isLocalInquiryAcceptanceMode, validateEnvironment } from "@/lib/env"
import { readControlledProfileScenario } from "../../controlled-profile-scenario"
import { CLINIC_DASHBOARD_CONTRACT_HEADER_NAME, clinicDashboardContractHeaders } from "../../payload-contract"
import {
  clinicScopeBootstrapSchema,
  type ClinicScopeBootstrap,
  type ClinicDashboardAccessResult,
} from "../model/auth"

const BOOTSTRAP_ERROR_CODES = {
  401: "CLINIC_DASHBOARD_UNAUTHORIZED",
  403: "CLINIC_DASHBOARD_ACCESS_DENIED",
  503: "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE",
} as const

const controlledAuthenticatedClinicContext = (accessToken: string): ClinicScopeBootstrap => {
  const capabilities = [
    "clinic-profile:view",
    "clinic-profile:edit",
    "clinic-gallery:view",
    "clinic-gallery:edit",
    "clinic-treatments:view",
    "clinic-treatments:edit",
    "clinic-inquiries:view",
    "clinic-inquiries:edit",
  ] as const
  const clinic = {
    id: isLocalInquiryAcceptanceMode()
      ? (process.env.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_ID ?? "")
      : "controlled-clinic",
    name: isLocalInquiryAcceptanceMode()
      ? (process.env.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_NAME ?? "")
      : "Controlled Clinic",
    capabilities,
  }
  return {
    schemaVersion: "clinic-scope-v1",
    principal: {
      displayName: "Alex Morgan",
      email: "clinic-staff@example.com",
      id: "controlled-clinic-staff",
    },
    status: "approved",
    clinics:
      accessToken === "controlled-empty"
        ? []
        : accessToken === "controlled-many"
          ? [clinic, { id: "controlled-second-clinic", name: "Second Controlled Clinic", capabilities }]
          : [clinic],
  }
}

function hasPrivateBootstrapHeaders(response: Response) {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? ""
  const varyFields = new Set(
    (response.headers.get("vary") ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )

  return (
    cacheControl.includes("private") &&
    cacheControl.includes("no-store") &&
    varyFields.has("authorization") &&
    varyFields.has(CLINIC_DASHBOARD_CONTRACT_HEADER_NAME.toLowerCase()) &&
    varyFields.has("x-findmydoc-clinic-scope-contract")
  )
}

async function readErrorCode(response: Response) {
  const body: unknown = await response.json().catch(() => null)
  if (!body || typeof body !== "object" || !("error" in body)) return undefined

  const error = body.error
  if (!error || typeof error !== "object" || !("code" in error)) return undefined

  return typeof error.code === "string" ? error.code : undefined
}

export async function fetchClinicDashboardBootstrap(
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<ClinicDashboardAccessResult> {
  if (isControlledAuthTestMode()) {
    const controlledToken = readControlledProfileScenario(accessToken).accessToken
    if (controlledToken === "controlled-denied") return { status: "denied" }
    if (controlledToken === "controlled-outage") return { status: "temporarily-unavailable" }
    return { context: controlledAuthenticatedClinicContext(controlledToken), status: "approved" }
  }

  const environment = validateEnvironment()
  const endpoint = new URL("/api/clinic-dashboard/bootstrap", environment.PAYLOAD_API_URL)
  let response: Response

  try {
    response = await fetcher(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...clinicDashboardContractHeaders(),
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    return { status: "temporarily-unavailable" }
  }

  if (!hasPrivateBootstrapHeaders(response)) return { status: "temporarily-unavailable" }

  if (response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const parsed = clinicScopeBootstrapSchema.safeParse(body)
    return parsed.success
      ? { context: parsed.data, status: "approved" }
      : { status: "temporarily-unavailable" }
  }

  if (response.status === 401 || response.status === 403 || response.status === 503) {
    const expectedCode = BOOTSTRAP_ERROR_CODES[response.status]
    const actualCode = await readErrorCode(response)
    if (actualCode !== expectedCode) return { status: "temporarily-unavailable" }

    if (response.status === 401) return { status: "unauthorized" }
    if (response.status === 403) return { status: "denied" }
  }

  return { status: "temporarily-unavailable" }
}
