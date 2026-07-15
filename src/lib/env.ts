import { z } from "zod"

const environmentSchema = z
  .object({
    DASHBOARD_PASSWORD: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    NEXT_PUBLIC_DEPLOYMENT_ENV: z.enum(["preview", "production"]).optional(),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  })
  .superRefine((environment, context) => {
    if (environment.DASHBOARD_PASSWORD || isLocalPasswordFallbackAllowed(environment)) return

    context.addIssue({
      code: "custom",
      message: "DASHBOARD_PASSWORD is required outside local development and tests",
      path: ["DASHBOARD_PASSWORD"],
    })
  })

export type RuntimeEnvironment = z.infer<typeof environmentSchema>

export function isLocalPasswordFallbackAllowed(
  environment: Record<string, string | undefined> = process.env,
) {
  const deploymentEnvironment = environment.VERCEL_ENV || environment.NEXT_PUBLIC_DEPLOYMENT_ENV
  const isDeployed = deploymentEnvironment === "preview" || deploymentEnvironment === "production"

  return !isDeployed && (environment.NODE_ENV === "development" || environment.NODE_ENV === "test")
}

export function validateEnvironment(input: Record<string, string | undefined> = process.env) {
  return environmentSchema.parse(input)
}
