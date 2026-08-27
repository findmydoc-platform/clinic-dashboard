import type { NextConfig } from "next"
import { createClinicManagedMediaImageConfig } from "./src/lib/clinic-managed-media-image-config"

const localAcceptanceDistDir =
  process.env.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE === "inquiry-communication" &&
  process.env.VERCEL_ENV === undefined &&
  process.env.NODE_ENV !== "production" &&
  /^\.next-cross-app-[a-z0-9-]+$/u.test(process.env.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_DIST_DIR ?? "")
    ? process.env.CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_DIST_DIR
    : undefined

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(localAcceptanceDistDir ? { distDir: localAcceptanceDistDir } : {}),
  images: createClinicManagedMediaImageConfig(),
  reactStrictMode: true,
}

export default nextConfig
