import type { ClinicMessage, MessageAttachmentMetadata } from "./messages"

export type MessageCommands = Readonly<{
  sendMessage: (
    input: Readonly<{
      attachment?: MessageAttachmentMetadata
      body: string
      conversationId: string
    }>,
  ) => Promise<ClinicMessage>
}>
