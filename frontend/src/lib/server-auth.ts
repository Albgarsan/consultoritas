import { headers } from "next/headers"

export type AuthUser = {
  role?: string
  email?: string
  first_name?: string
}

function normalizeOrigin(raw?: string | null): string | null {
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.origin
  } catch {
    return null
  }
}

function sanitizeHostHeader(raw?: string | null): string | null {
  if (!raw) return null
  const host = raw.trim().toLowerCase().split(",")[0]
  // Accept host or host:port only.
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/.test(host)) return null
  return host
}

function isTrustedHost(host: string, trustedHosts: Set<string>): boolean {
  return trustedHosts.has(host)
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const requestHeaders = await headers()
  const hostHeader = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  const protoHeader = requestHeaders.get("x-forwarded-proto") || ""

  const configuredAppOrigin = normalizeOrigin(process.env.APP_BASE_URL)
  const trustedHosts = new Set(
    (process.env.TRUSTED_SERVER_HOSTS || "localhost:3000,127.0.0.1:3000,frontend:3000")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )

  const sanitizedHost = sanitizeHostHeader(hostHeader)
  const normalizedProto = protoHeader === "https" ? "https" : "http"

  const trustedRequestOrigin =
    sanitizedHost && isTrustedHost(sanitizedHost, trustedHosts)
      ? `${normalizedProto}://${sanitizedHost}`
      : null

  const baseOrigin = configuredAppOrigin || trustedRequestOrigin || "http://localhost:3000"

  try {
    const target = new URL("/api/users/me/", baseOrigin).toString()

    // First, try the incoming origin (respects proxy headers). If that
    // fails (connectivity inside docker), fallback to an internal backend
    // service address. Allow overriding via `process.env.BACKEND_URL`.
    const backendFallback = process.env.BACKEND_URL || "http://backend:8000"

    let response = null
    try {
      response = await fetch(target, {
        method: "GET",
        headers: {
          cookie: requestHeaders.get("cookie") || "",
        },
        cache: "no-store",
      })
    } catch (err) {
      // ignore and try fallback
    }

    if (!response || !response.ok) {
      try {
        const fallbackTarget = new URL("/api/users/me/", backendFallback).toString()
        response = await fetch(fallbackTarget, {
          method: "GET",
          headers: {
            cookie: requestHeaders.get("cookie") || "",
          },
          cache: "no-store",
        })
      } catch (err) {
        return null
      }
    }

    if (response.status === 401 || response.status === 403) return null
    if (!response.ok) return null

    const user = await response.json().catch(() => null)
    if (!user || typeof user !== "object") return null
    return user as AuthUser
  } catch (err) {
    // Network issues or mis-configured host -> treat as unauthenticated
    return null
  }
}
