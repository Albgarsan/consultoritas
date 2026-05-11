"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ClientSidebar } from "@/components/client/sidebar"
import { DashboardView } from "@/components/client/client-view"
import { ClientAppointmentsView } from "@/components/client/appointments-view"
import { FacturacionView } from "@/components/client/facturacion-view"
import { AjustesView } from "@/components/client/settings"
import { apiFetch, type DocumentoFacturacion, type TaxCalendarEntry } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClientePage() {
  const router = useRouter()
  const [view, setView] = useState("dashboard")
  const [user, setUser] = useState<{ first_name?: string; email?: string } | null>(null)
  const [documents, setDocuments] = useState<DocumentoFacturacion[]>([])
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [appointments, setAppointments] = useState<Array<Record<string, unknown>>>([])
  const [calendarEntries, setCalendarEntries] = useState<TaxCalendarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDocuments = async () => {
    const docsRes = await apiFetch(`/api/documents/`)
    const docsData = await docsRes.json().catch(() => [])
    setDocuments(Array.isArray(docsData) ? docsData : docsData.results || [])
  }

  const fetchStats = async () => {
    try {
      const statsRes = await apiFetch(`/api/documents/stats/`)
      const statsData = await statsRes.json().catch(() => null)
      setStats(statsData)
    } catch {}
  }

  const fetchAppointments = async () => {
    const appointmentsRes = await apiFetch(`/api/business/appointments/`)
    const appointmentsData = await appointmentsRes.json().catch(() => [])
    setAppointments(Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.results || [])
  }

  const fetchCalendar = async () => {
    try {
      const res = await apiFetch(`/api/business/tax-calendar/`)
      const data = await res.json().catch(() => [])
      setCalendarEntries(Array.isArray(data) ? data : data.results || [])
    } catch {
      setCalendarEntries([])
    }
  }

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    ;(async () => {
      try {
        const [userResult, docsResult, statsResult, appointmentsResult, calendarResult] = await Promise.allSettled([
          apiFetch(`/api/users/me/`),
          apiFetch(`/api/documents/`),
          apiFetch(`/api/documents/stats/`),
          apiFetch(`/api/business/appointments/`),
          apiFetch(`/api/business/tax-calendar/`),
        ])

        const userResponse = userResult.status === "fulfilled" ? userResult.value : null
        if (userResponse?.status === 401 || userResponse?.status === 403) {
          if (!cancelled) setIsLoading(false)
          router.push("/login")
          return
        }

        if (userResponse?.ok) {
          const userData = await userResponse.json().catch(() => null)
          if (userData && !cancelled) setUser(userData)
        }

        if (!cancelled) {
          if (docsResult.status === "fulfilled" && docsResult.value.ok) {
            const docsData = await docsResult.value.json().catch(() => [])
            setDocuments(Array.isArray(docsData) ? docsData : docsData.results || [])
          }
          if (statsResult.status === "fulfilled" && statsResult.value.ok) {
            const statsData = await statsResult.value.json().catch(() => null)
            setStats(statsData)
          }
          if (appointmentsResult.status === "fulfilled" && appointmentsResult.value.ok) {
            const appointmentsData = await appointmentsResult.value.json().catch(() => [])
            setAppointments(Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.results || [])
          }
          if (calendarResult.status === "fulfilled" && calendarResult.value.ok) {
            const calendarData = await calendarResult.value.json().catch(() => [])
            setCalendarEntries(Array.isArray(calendarData) ? calendarData : calendarData.results || [])
          }
        }
      } catch (err) {
        console.error("Error fetching cliente data:", err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await apiFetch("/api/users/logout/", { method: "POST" })
    } catch {
      // If logout fails, still send user to landing page.
    }
    document.cookie = "consultoritas_role=; Path=/; Max-Age=0"
    router.push("/")
  }

  useEffect(() => {
    const handleRefresh = () => {
      fetchDocuments().catch((err) => console.error("Error refreshing documents:", err))
      fetchStats().catch((err) => console.error("Error refreshing stats:", err))
      fetchAppointments().catch((err) => console.error("Error refreshing appointments:", err))
      fetchCalendar().catch((err) => console.error("Error refreshing calendar:", err))
    }

    const handleDocumentsUpdated = () => {
      fetchDocuments().catch((err) => console.error("Error refreshing documents:", err))
      fetchStats().catch((err) => console.error("Error refreshing stats:", err))
    }

    const handleAppointmentsUpdated = () => {
      fetchAppointments().catch((err) => console.error("Error refreshing appointments:", err))
    }

    window.addEventListener("consultoritas:refresh", handleRefresh)
    window.addEventListener("consultoritas:documents-updated", handleDocumentsUpdated)
    window.addEventListener("consultoritas:appointments-updated", handleAppointmentsUpdated)
    return () => {
      window.removeEventListener("consultoritas:refresh", handleRefresh)
      window.removeEventListener("consultoritas:documents-updated", handleDocumentsUpdated)
      window.removeEventListener("consultoritas:appointments-updated", handleAppointmentsUpdated)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-16 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-md">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="p-6 space-y-6">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <ClientSidebar currentView={view} onNavigate={setView} onLogout={handleLogout} />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-2 border-b px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-bold uppercase text-accent tracking-widest">Mi Portal</h1>
          </div>
          {user && (
            <div className="text-sm font-medium text-muted-foreground mr-4">
              Bienvenido/a, {user.first_name || user.email}
            </div>
          )}
        </header>
        <main className="p-6">
          {view === "dashboard" && <DashboardView onNavigate={setView} user={user} documents={documents} stats={stats} calendarEntries={calendarEntries} isLoading={false} />}
          {view === "citas" && <ClientAppointmentsView appointments={appointments} user={user} />}
          {view === "documentos" && <FacturacionView documents={documents} />}
          {view === "facturacion" && <FacturacionView documents={documents} />}
          {view === "settings" && <AjustesView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
