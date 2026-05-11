import { headers } from "next/headers"

export type AuthUser = {
  role?: string
  email?: string
  first_name?: string
}

export async function getServerAuthUser(): Promise<AuthUser | null> {
  const requestHeaders = await headers()
  const hostHeader = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  const protoHeader = requestHeaders.get("x-forwarded-proto") || ""

  // Build a safe base URL. Use the host as provided by the proxy (nginx) or
  // the incoming request. Only fallback to the local development host when
  // the header is missing.
  const host = hostHeader || "localhost:3000"
  const proto = protoHeader || "http"

  try {
    const base = `${proto}://${host}`
    const target = new URL("/api/users/me/", base).toString()

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
