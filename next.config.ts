import type { NextConfig } from "next"
import { createClinicManagedMediaImageConfig } from "./src/lib/clinic-managed-media-image-config"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: createClinicManagedMediaImageConfig(),
  reactStrictMode: true,
}

export default nextConfig
