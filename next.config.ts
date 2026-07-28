import type { NextConfig } from "next"
import { createDoctorMediaImageConfig } from "./src/lib/doctor-media-image-config"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: createDoctorMediaImageConfig(),
  reactStrictMode: true,
}

export default nextConfig
