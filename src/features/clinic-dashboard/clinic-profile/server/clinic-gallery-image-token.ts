import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { validateEnvironment } from "@/lib/env"

const TOKEN_VERSION = "v1"
const IV_BYTES = 12
const KEY_CONTEXT = "clinic-dashboard-gallery-image-proxy"

function encryptionKey(secret: string) {
  return createHash("sha256").update(`${KEY_CONTEXT}\0${secret}`).digest()
}

export function sealClinicGalleryImageSource(
  sourceUrl: string,
  secret = validateEnvironment().CSRF_SIGNING_SECRET,
) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv)
  const ciphertext = Buffer.concat([cipher.update(sourceUrl, "utf8"), cipher.final()])
  const authenticationTag = cipher.getAuthTag()
  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authenticationTag.toString("base64url"),
  ].join(".")
}

export function openClinicGalleryImageSource(
  token: string,
  secret = validateEnvironment().CSRF_SIGNING_SECRET,
) {
  const [version, encodedIv, encodedCiphertext, encodedTag, extra] = token.split(".")
  if (version !== TOKEN_VERSION || !encodedIv || !encodedCiphertext || !encodedTag || extra) return undefined

  try {
    const iv = Buffer.from(encodedIv, "base64url")
    const ciphertext = Buffer.from(encodedCiphertext, "base64url")
    const authenticationTag = Buffer.from(encodedTag, "base64url")
    if (iv.length !== IV_BYTES || authenticationTag.length !== 16 || ciphertext.length === 0) return undefined
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv)
    decipher.setAuthTag(authenticationTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  } catch {
    return undefined
  }
}
