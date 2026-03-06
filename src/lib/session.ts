"use server"

import { cookies } from "next/headers"

import crypto from "crypto"

import { env } from "~/env"

const COOKIE_NAME = "crui_session"
const ALGORITHM = "aes-256-gcm"
const SESSION_SALT = "crui-salt"
const SESSION_MAX_AGE = 60 * 60 * 24

function getKey(): Buffer {
  const secret = env.SESSION_SECRET
  return crypto.scryptSync(secret, SESSION_SALT, 32)
}

function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

function decrypt(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split(":")
    if (parts.length !== 3) return null

    const iv = Buffer.from(parts[0]!, "hex")
    const authTag = Buffer.from(parts[1]!, "hex")
    const encrypted = parts[2]!

    const key = getKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch {
    return null
  }
}

export interface Credentials {
  username: string
  password: string
}

export async function setSession(
  username: string,
  password: string,
): Promise<void> {
  const data = JSON.stringify({ username, password })
  const encrypted = encrypt(data)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function getSession(): Promise<Credentials | null> {
  if (env.REGISTRY_USERNAME && env.REGISTRY_PASSWORD) {
    return {
      username: env.REGISTRY_USERNAME,
      password: env.REGISTRY_PASSWORD,
    }
  }

  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) return null

  const decrypted = decrypt(cookie.value)
  if (!decrypted) return null

  try {
    const parsed = JSON.parse(decrypted) as Credentials
    if (parsed.username && parsed.password) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
