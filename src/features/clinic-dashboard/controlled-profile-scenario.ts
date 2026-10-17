// Synthetic scenario identity travels only through the existing controlled-session seam.
const scenarioTokenPattern =
  /^(controlled-(?:access-token|many|empty|denied|outage)):profile:([A-Za-z0-9_-]{1,100})$/u
const baseTokenPattern = /^controlled-(?:access-token|many|empty|denied|outage)$/u

export function withControlledProfileScenario(accessToken: string, scenario: string | undefined) {
  return baseTokenPattern.test(accessToken) && scenario && /^[A-Za-z0-9_-]{1,100}$/u.test(scenario)
    ? `${accessToken}:profile:${scenario}`
    : accessToken
}

export function readControlledProfileScenario(accessToken: string) {
  const matched = scenarioTokenPattern.exec(accessToken)
  return { accessToken: matched?.[1] ?? accessToken, scenario: matched?.[2] }
}
