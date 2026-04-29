"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ClientSidebar } from "@/components/client/sidebar"
import { DashboardView } from "@/components/client/client-view"
import { DocumentosView } from "@/components/client/docs-manager"
import { FacturacionView } from "@/components/client/table-view"
import { AjustesView } from "@/components/client/settings"

export default function ClientePage() {
  const [view, setView] = useState("dashboard")

  return (
    <SidebarProvider>
      <ClientSidebar currentView={view} onNavigate={setView} onLogout={() => window.location.href="/"} />
      <SidebarInset className="bg-background">
        <header className="flex h-16 items-center gap-2 border-b px-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-bold uppercase text-accent tracking-widest">Mi Portal</h1>
        </header>
        <main className="p-6">
          {view === "dashboard" && <DashboardView onNavigate={setView} />}
          {view === "documentos" && <DocumentosView />}
          {view === "facturacion" && <FacturacionView />}
          {view === "settings" && <AjustesView />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
