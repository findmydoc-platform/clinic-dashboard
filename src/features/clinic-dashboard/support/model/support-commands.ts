import type { SupportReceipt, SupportRequest } from "./support-request"

export type SupportCommands = Readonly<{
  submitSupportRequest: (request: SupportRequest) => Promise<SupportReceipt>
}>
