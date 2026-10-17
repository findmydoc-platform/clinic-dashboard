import { clinicScopeBootstrapSchema, type ClinicScopeBootstrap } from "../model/auth"

export type ClinicAccessChoices =
  | Readonly<{ status: "approved"; context: ClinicScopeBootstrap }>
  | Readonly<{ status: "denied" | "unauthorized" | "temporarily-unavailable" }>

/** Refreshes current personal choices without replacing an otherwise valid session. */
export async function loadClinicDashboardChoices(
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ClinicAccessChoices> {
  try {
    const timeout = AbortSignal.timeout(8_000)
    const response = await fetcher("/api/dashboard/bootstrap", {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      headers: { Accept: "application/json" },
      signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    })
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json"))
      return { status: "temporarily-unavailable" }
    const body: unknown = await response.json()
    if (!response.ok) {
      const expected =
        response.status === 401
          ? "CLINIC_DASHBOARD_UNAUTHORIZED"
          : response.status === 403
            ? "CLINIC_DASHBOARD_ACCESS_DENIED"
            : undefined
      if (
        !expected ||
        !body ||
        typeof body !== "object" ||
        Object.keys(body).length !== 1 ||
        !("code" in body) ||
        body.code !== expected
      )
        return { status: "temporarily-unavailable" }
      return { status: response.status === 401 ? "unauthorized" : "denied" }
    }
    const parsed = clinicScopeBootstrapSchema.safeParse(body)
    return parsed.success
      ? { status: "approved", context: parsed.data }
      : { status: "temporarily-unavailable" }
  } catch {
    return { status: "temporarily-unavailable" }
  }
}
