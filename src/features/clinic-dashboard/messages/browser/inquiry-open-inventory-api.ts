import type { InquiryOpenInventoryCommands } from "../model/inquiry-open-inventory"
import { isInquiryOpenInventory } from "../model/inquiry-open-inventory"

export function createInquiryOpenInventoryApiCommands(
  clinicId: string,
  fetcher: typeof fetch = fetch,
): InquiryOpenInventoryCommands {
  return {
    async loadOpenInventory() {
      try {
        const response = await fetcher(
          `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/inquiries/open-inventory`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
            redirect: "error",
            signal: AbortSignal.timeout(8_000),
          },
        )
        if (!response.ok)
          return {
            ok: false,
            error: {
              code:
                response.status === 401
                  ? "unauthorized"
                  : response.status === 403
                    ? "access-denied"
                    : "service-unavailable",
            },
          }
        const value: unknown = await response.json()
        return isInquiryOpenInventory(value)
          ? { ok: true, value }
          : { ok: false, error: { code: "service-unavailable" } }
      } catch {
        return { ok: false, error: { code: "service-unavailable" } }
      }
    },
  }
}
