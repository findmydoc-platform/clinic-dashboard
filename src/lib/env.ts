import { z } from "zod"

const environmentSchema = z.object({
  DASHBOARD_PASSWORD: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  NEXT_PUBLIC_DEPLOYMENT_ENV: z.enum(["preview", "production"]).optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
})

export type RuntimeEnvironment = z.infer<typeof environmentSchema>

export function validateEnvironment(input: Record<string, string | undefined> = process.env) {
  return environmentSchema.parse(input)
}
