export type OperationalWorkloadCardState =
  Readonly<{ status: "loading" | "unavailable" }> | Readonly<{ status: "ready"; count: number }>
