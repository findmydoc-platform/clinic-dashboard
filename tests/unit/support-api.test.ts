// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createSupportApiCommand } from "@/features/clinic-dashboard/support/browser/support-api"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"
const input = { subject: "Profile update failed", message: "The clinic profile fails to save the changes." }
describe("support browser command", () => {
  beforeEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=synthetic-csrf; path=/`
  })
  afterEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })
  it.each(["failed", "unknown"] as const)(
    "retains the server-confirmed %s outcome without retry",
    async (status) => {
      const fetcher = vi.fn(async () => Response.json({ status }, { status: 502 }))
      vi.stubGlobal("fetch", fetcher)
      await expect(createSupportApiCommand("clinic-a")(input)).resolves.toEqual({ status })
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        "/api/dashboard/clinics/clinic-a/support",
        expect.objectContaining({
          method: "POST",
          credentials: "same-origin",
          redirect: "error",
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json", "x-csrf-token": "synthetic-csrf" },
        }),
      )
    },
  )
  it("reports a dropped HTTP connection as unknown without retry", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Synthetic dropped connection")
    })
    vi.stubGlobal("fetch", fetcher)
    await expect(createSupportApiCommand("clinic-a")(input)).resolves.toEqual({ status: "unknown" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it("aborts a stalled HTTP request at 25 seconds and never retries it", async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn<typeof fetch>(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          signal = options?.signal ?? undefined
          signal?.addEventListener("abort", () => reject(new DOMException("Synthetic abort", "AbortError")), {
            once: true,
          })
        }),
    )
    vi.stubGlobal("fetch", fetcher)
    let settled = false
    const result = createSupportApiCommand("clinic-a")(input).then((value) => {
      settled = true
      return value
    })
    await vi.advanceTimersByTimeAsync(24_999)
    expect(settled).toBe(false)
    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual({ status: "unknown" })
    expect(signal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(50_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
