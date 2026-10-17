import { expect, it } from "vitest"
import { notificationsResponseSchema } from "@/features/clinic-dashboard/notifications/model/notification-schema"
import cases from "../fixtures/clinic-notifications-v1.json"

it("requires a bounded source clinic attribution for every presentation entry", () => {
  const response = structuredClone(cases[0]!.response)
  const item = response.items![0]!
  Object.assign(item, { clinic: { id: "clinic-one", name: "Current Clinic One" } })
  expect(notificationsResponseSchema.safeParse(response).success).toBe(true)
  Reflect.deleteProperty(item, "clinic")
  expect(notificationsResponseSchema.safeParse(response).success).toBe(false)
})
