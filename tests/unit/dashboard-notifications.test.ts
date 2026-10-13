import { describe, expect, it } from "vitest"
import { assertClinicDashboardNotificationTargets } from "@/features/clinic-dashboard/workspace/model/notifications"
import { notificationsFixture } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"

describe("dashboard notification fixtures", () => {
  it("rejects unknown location and review notification targets", () => {
    const targetIndex = {
      "berlin-charlottenburg": {
        reviewIds: ["charlottenburg-review-markus-schmidt"],
      },
      "berlin-mitte": { reviewIds: [] },
    }
    expect(() => assertClinicDashboardNotificationTargets(notificationsFixture, targetIndex)).not.toThrow()
    expect(() =>
      assertClinicDashboardNotificationTargets(
        [{ ...notificationsFixture[0]!, locationId: "unknown" }],
        targetIndex,
      ),
    ).toThrow(/unknown location/)
    expect(() =>
      assertClinicDashboardNotificationTargets(
        [
          {
            ...notificationsFixture[1]!,
            target: { kind: "review", reviewId: "unknown" },
          },
        ],
        targetIndex,
      ),
    ).toThrow(/unknown review/)
  })
})
