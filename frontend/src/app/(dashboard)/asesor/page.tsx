"use client"

import { useState, useEffect, Suspense } from "react"
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
import { AltaAsesor } from "@/components/advisor/alta-asesor"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { useApiData } from "@/lib/use-api"

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
      <Skeleton className="h-60 rounded-2xl" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function ClientsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export default function AdvisorPage() {
  const router = useRouter()
  const [view, setView] = useState("dashboard")

  // Consumo reactivo del perfil del asesor mediante SWR unificado
  const { data: user, error: authError, mutate: mutateUser, isLoading } = useApiData<{
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    role?: string
    is_principal?: boolean
  }>("/api/users/me/")

  // Redirección si la sesión expira o no es válida
  useEffect(() => {
    if (authError) {
      router.push("/login")
    }
  }, [authError, router])

  // Escuchar el bus de eventos global para refrescar el perfil si fuera necesario
  useEffect(() => {
    const handleUpdate = () => {
      void mutateUser()
    }
    window.addEventListener("consultoritas:refresh", handleUpdate)
    return () => window.removeEventListener("consultoritas:refresh", handleUpdate)
  }, [mutateUser])

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
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AdvisorSidebar currentView={view} onNavigate={setView} onLogout={handleLogout} isPrincipal={user?.is_principal} />
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
          {view === "dashboard" && (
            <Suspense fallback={<DashboardSkeleton />}>
              <AdvisorView onNavigate={setView} />
            </Suspense>
          )}
          {view === "clientes" && (
            <Suspense fallback={<ClientsSkeleton />}>
              <GestionClientes onNavigateToMonitor={() => setView("monitor-ia")} />
            </Suspense>
          )}
          {view === "validacion" && (
            <Suspense fallback={<TableSkeleton />}>
              <ValidacionDocumental />
            </Suspense>
          )}
          {view === "monitor-ia" && (
            <Suspense fallback={<DashboardSkeleton />}>
              <MonitorIA />
            </Suspense>
          )}
          {view === "facturacion" && (
            <Suspense fallback={<TableSkeleton />}>
              <FacturacionView />
            </Suspense>
          )}
          {view === "settings" && (
            <Suspense fallback={<DashboardSkeleton />}>
              <AdvisorSettings />
            </Suspense>
          )}
          {view === "citas" && (
            <Suspense fallback={<TableSkeleton />}>
              <AppointmentsManager onNavigateToSettings={() => setView("settings")} />
            </Suspense>
          )}
          {view === "compliance" && (
            <Suspense fallback={<TableSkeleton />}>
              <ComplianceDashboard />
            </Suspense>
          )}
          {view === "alta-asesor" && user?.is_principal && (
            <Suspense fallback={<DashboardSkeleton />}>
              <AltaAsesor onSuccess={() => void mutateUser()} />
            </Suspense>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
