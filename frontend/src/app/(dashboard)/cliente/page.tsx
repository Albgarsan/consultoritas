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
import { apiFetch } from "@/lib/api"
import { useApiData } from "@/lib/use-api"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function ClientePage() {
  const router = useRouter()
  const [view, setView] = useState("dashboard")
  const currentYear = new Date().getFullYear()

  // 1. Captura del perfil de usuario autenticado
  const { data: user, error: authError, isLoading: isUserLoading } = useApiData<{ id?: string; first_name?: string; email?: string }>(
    "/api/users/me/"
  )

  // 2. Repositorio documental impositivo del cliente
  const { data: documents = [], mutate: mutateDocuments, isLoading: isDocsLoading } = useApiData<any[]>(
    `/api/documents/?tenant=${user?.id}`,
    { dedupingInterval: 10000 }
  )

  // 3. Estadísticas de facturación
  const { data: stats = null, mutate: mutateStats } = useApiData<Record<string, unknown>>(
    "/api/documents/stats/",
    { dedupingInterval: 10000 }
  )

  // 4. Gestión de citas agendadas
  const { data: appointments = [], mutate: mutateAppointments } = useApiData<any[]>(
    "/api/business/appointments/",
    { dedupingInterval: 10000 }
  )

  // 5. Calendario Fiscal Unificado con Polling (Refresco activo en segundo plano cada 15 segundos)
  const { data: calendarEntries = [], mutate: mutateCalendar, isLoading: isCalendarLoading } = useApiData<any[]>(
    `/api/documents/tax-calendar/?year=${currentYear}`,
    {
      revalidateOnFocus: true,
      refreshInterval: 15000,
      dedupingInterval: 5000,
    }
  )

  const isLoading = isUserLoading

  // Redirección forzosa al login si el backend deniega las credenciales de sesión
  useEffect(() => {
    if (authError) {
      router.push("/login")
    }
  }, [authError, router])

  const handleLogout = async () => {
    try {
      await apiFetch("/api/users/logout/", { method: "POST" })
    } catch {
      /* ignore */
    }
    document.cookie = "consultoritas_role=; Path=/; Max-Age=0"
    router.push("/")
  }

  // Bus de eventos local: reacciona instantáneamente a acciones del propio cliente en su panel
  useEffect(() => {
    const handleRefresh = () => {
      void mutateDocuments()
      void mutateStats()
      void mutateAppointments()
      void mutateCalendar()
    }

    const handleDocumentsUpdated = () => {
      void mutateDocuments()
      void mutateStats()
    }

    const handleAppointmentsUpdated = () => {
      void mutateAppointments()
    }

    window.addEventListener("consultoritas:refresh", handleRefresh)
    window.addEventListener("consultoritas:documents-updated", handleDocumentsUpdated)
    window.addEventListener("consultoritas:appointments-updated", handleAppointmentsUpdated)

    return () => {
      window.removeEventListener("consultoritas:refresh", handleRefresh)
      window.removeEventListener("consultoritas:documents-updated", handleDocumentsUpdated)
      window.removeEventListener("consultoritas:appointments-updated", handleAppointmentsUpdated)
    }
  }, [mutateDocuments, mutateStats, mutateAppointments, mutateCalendar])

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
          {view === "dashboard" && (
            <DashboardView
              onNavigate={setView}
              user={user}
              documents={documents}
              stats={stats}
              calendarEntries={calendarEntries}
              isLoading={false}
            />
          )}
          {view === "citas" && <ClientAppointmentsView appointments={appointments} user={user} />}
          {view === "documentos" && <FacturacionView documents={documents} />}
          {view === "facturacion" && <FacturacionView documents={documents} />}
          {view === "settings" && <AjustesView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
