export type InquiryOpenInventory = Readonly<{ count: number }>

export type InquiryOpenInventoryCommands = Readonly<{
  loadOpenInventory: () => Promise<import("./inquiries").InquiryResult<InquiryOpenInventory>>
}>

export function isInquiryOpenInventory(value: unknown): value is InquiryOpenInventory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 1 &&
    typeof record.count === "number" &&
    Number.isSafeInteger(record.count) &&
    record.count >= 0
  )
}
