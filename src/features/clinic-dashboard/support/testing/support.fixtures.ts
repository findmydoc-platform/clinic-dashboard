import type { SupportCommands } from "../model/support-commands"

export function createSupportCommandsFixture(latencyMs = 0): SupportCommands {
  return {
    submitSupportRequest: async () => {
      if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))

      return {
        expectedResponse: "within one business day",
        ticketId: "FMD-1042",
      }
    },
  }
}
