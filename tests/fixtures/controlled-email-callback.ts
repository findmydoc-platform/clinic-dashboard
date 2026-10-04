export function controlledEmailCallbackPath(flow: "invite" | "recovery") {
  const next = flow === "invite" ? "/auth/invite/complete" : "/auth/password/reset/complete"
  return `/auth/callback?token_hash=controlled-${flow}-token&type=${flow}&next=${next}&actionRef=controlled-${flow}-reference`
}
