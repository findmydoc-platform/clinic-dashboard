export type EditorDepartureIntent = "context-change" | "destination" | "section" | "access-loss"

/** Opaque editor-owned work retained privately after its inaccessible UI is removed. */
export type ProtectedEditorWork = Readonly<{
  draft: unknown
  discard: () => void | Promise<void>
}>

export type EditorDepartureRequest = (
  continuation: () => void,
  onCancel?: () => void,
  intent?: EditorDepartureIntent,
) => ProtectedEditorWork | void
