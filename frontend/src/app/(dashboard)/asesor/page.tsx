"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdvisorSidebar } from "@/components/advisor/sidebar"
import { AdvisorView } from "@/components/advisor/advisor-view"
import { GestionClientes } from "@/components/advisor/client-management"
import { ValidacionDocumental } from "@/components/advisor/validator"
import { MonitorIA } from "@/components/advisor/ai-monitor"
import { FacturacionView } from "@/components/advisor/table-view"
import { AdvisorSettings } from "@/components/advisor/settings"
import { AppointmentsManager } from "@/components/advisor/appointments-manager"
import { ComplianceDashboard } from "@/components/advisor/compliance-dashboard"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

export default function AdvisorPage() {
  const router = useRouter()
  const [view, setView] = useState("dashboard")
  type ApiRecord = Record<string, unknown>
  type AdvisorUser = { first_name?: string; last_name?: string; email?: string; role?: string }
  const [user, setUser] = useState<AdvisorUser | null>(null)
  const [documents, setDocuments] = useState<ApiRecord[]>([])
  const [clients, setClients] = useState<ApiRecord[]>([])
  const [appointments, setAppointments] = useState<ApiRecord[]>([])
  const [businessId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const extractResults = useCallback(async (response: Response) => {
    const payload = await response.json().catch(() => [])
    if (Array.isArray(payload)) {
      return payload
    }
    if (payload && typeof payload === "object" && Array.isArray((payload as { results?: ApiRecord[] }).results)) {
      return (payload as { results: ApiRecord[] }).results
    }
    return []
  }, [])

  const loadAllData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }
    try {
      const [userResult, documentsResult, clientsResult, appointmentsResult] = await Promise.allSettled([
        apiFetch("/api/users/me/"),
        apiFetch("/api/documents/"),
        apiFetch("/api/users/clients/"),
        apiFetch("/api/business/appointments/"),
      ])

      const userResponse = userResult.status === "fulfilled" ? userResult.value : null
      if (userResponse?.status === 401 || userResponse?.status === 403) {
        setIsLoading(false)
        router.push("/login")
        return
      }

      if (userResponse?.ok) {
        const userData = await userResponse.json().catch(() => null)
        if (userData) setUser(userData)
      }

      if (documentsResult.status === "fulfilled" && documentsResult.value.ok) {
        const data = await extractResults(documentsResult.value)
        setDocuments(data)
      }

      if (clientsResult.status === "fulfilled" && clientsResult.value.ok) {
        const data = await clientsResult.value.json().catch(() => [])
        setClients(Array.isArray(data) ? data : data.results || [])
      }

      if (appointmentsResult.status === "fulfilled" && appointmentsResult.value.ok) {
        const data = await extractResults(appointmentsResult.value)
        setAppointments(data)
      }
    } catch {
      toast.error("Error de sincronización")
    } finally {
      setIsLoading(false)
    }
  }, [router, extractResults])

  useEffect(() => {
    void loadAllData()
  }, [loadAllData])

  useEffect(() => {
    const handleUpdate = () => {
      void loadAllData({ silent: true })
    }

    window.addEventListener("consultoritas:documents-updated", handleUpdate)
    window.addEventListener("consultoritas:clients-updated", handleUpdate)
    window.addEventListener("consultoritas:appointments-updated", handleUpdate)
    window.addEventListener("consultoritas:refresh", handleUpdate)

    return () => {
      window.removeEventListener("consultoritas:documents-updated", handleUpdate)
      window.removeEventListener("consultoritas:clients-updated", handleUpdate)
      window.removeEventListener("consultoritas:appointments-updated", handleUpdate)
      window.removeEventListener("consultoritas:refresh", handleUpdate)
    }
  }, [loadAllData])

  const handleLogout = async () => {
    try {
      await apiFetch("/api/users/logout/", { method: "POST" })
    } catch {}
    document.cookie = "consultoritas_role=; Path=/; Max-Age=0"
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-16 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-md">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdvisorSidebar currentView={view} onNavigate={setView} onLogout={handleLogout} />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-2 border-b px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <h1 className="text-sm font-bold uppercase text-primary tracking-widest">Consultoritas - Despacho</h1>
          </div>
          <div className="text-sm font-medium text-muted-foreground mr-4 flex items-center gap-2">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            Asesor: {user?.first_name || user?.email}
          </div>
        </header>
        <main className="p-6">
          {view === "dashboard" && <AdvisorView onNavigate={setView} />}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {view === "clientes" && <GestionClientes onNavigateToMonitor={() => setView("monitor-ia")} clients={clients as any} />}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {view === "validacion" && <ValidacionDocumental documents={documents as any} />}
          {view === "monitor-ia" && <MonitorIA />}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {view === "facturacion" && <FacturacionView documents={documents as any} businessId={businessId} />}
          {view === "settings" && <AdvisorSettings />}
          {view === "citas" && <AppointmentsManager appointments={appointments} currentUser={user} businessId={businessId} onNavigateToSettings={() => setView("settings")} />}
          {view === "compliance" && <ComplianceDashboard />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
