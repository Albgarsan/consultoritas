import { NextRequest, NextResponse } from "next/server"

const PROTECTED_PREFIXES = ["/asesor", "/cliente"]
const ROLE_COOKIE = "consultoritas_role"
const SESSION_COOKIE = "sessionid"

function resolveExpectedArea(pathname: string): "asesor" | "cliente" | null {
  if (pathname === "/asesor" || pathname.startsWith("/asesor/")) return "asesor"
  if (pathname === "/cliente" || pathname.startsWith("/cliente/")) return "cliente"
  return null
}

function roleMatchesArea(role: string, expectedArea: "asesor" | "cliente" | null) {
  if (!expectedArea) return true
  if (expectedArea === "asesor") return role === "Asesor"
  return role !== "Asesor"
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl
  const expectedArea = resolveExpectedArea(pathname)
  if (!expectedArea) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  const cachedRole = request.cookies.get(ROLE_COOKIE)?.value || ""
  if (cachedRole) {
    if (!roleMatchesArea(cachedRole, expectedArea)) {
      return NextResponse.redirect(new URL(cachedRole === "Asesor" ? "/asesor" : "/cliente", origin))
    }
    return NextResponse.next()
  }

  try {
    const backendFallback = process.env.BACKEND_URL || "http://backend:8000"
    const cookieHeader = request.headers.get("cookie") || ""
    const commonInit = {
      method: "GET",
      headers: { cookie: cookieHeader },
      cache: "no-store" as const,
    }

    let meRes: Response | null = null
    try {
      meRes = await fetch(`${origin}/api/users/me/`, commonInit)
    } catch {
      meRes = null
    }

    if (!meRes || !meRes.ok) {
      try {
        meRes = await fetch(`${backendFallback}/api/users/me/`, commonInit)
      } catch {
        meRes = null
      }
    }

    if (!meRes || meRes.status === 401 || meRes.status === 403) {
      return NextResponse.redirect(new URL("/login", origin))
    }

    const meData = await meRes.json().catch(() => null)
    const role = String(meData?.role || "")
    const response = NextResponse.next()
    response.cookies.set(ROLE_COOKIE, role, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
    })

    if (!roleMatchesArea(role, expectedArea)) {
      return NextResponse.redirect(new URL(role === "Asesor" ? "/asesor" : "/cliente", origin))
    }

    return response
  } catch {
    return NextResponse.redirect(new URL("/login", origin))
  }
}

export const config = {
  matcher: ["/asesor/:path*", "/cliente/:path*"],
}
