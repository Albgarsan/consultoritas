"use client"

import { useState } from "react"
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

export default function AdvisorPage() {
  const [view, setView] = useState("dashboard")

  return (
    <SidebarProvider>
      <AdvisorSidebar currentView={view} onNavigate={setView} onLogout={() => window.location.href="/"} />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-2 border-b px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-bold uppercase text-primary tracking-widest">Despacho</h1>
        </header>
        <main className="p-6">
          {view === "dashboard" && <AdvisorView onNavigate={setView} />}
          {view === "clientes" && <GestionClientes onNavigateToMonitor={() => setView("monitor-ia")} />}
          {view === "validacion" && <ValidacionDocumental />}
          {view === "monitor-ia" && <MonitorIA />}
          {view === "facturacion" && <FacturacionView />}
          {view === "settings" && <AdvisorSettings />}
          {view === "citas" && <AppointmentsManager onNavigateToSettings={() => setView("settings")} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
