"use client"

import { LayoutDashboard, Receipt, CalendarDays, Settings, LogOut } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { ConsultoritasLogo } from "@/components/layout/logo"

export function ClientSidebar({ currentView, onNavigate, onLogout }: any) {
  const menu = [
    { id: "dashboard", label: "Mi Resumen", icon: LayoutDashboard },
    { id: "citas", label: "Mis Citas", icon: CalendarDays },
    { id: "facturacion", label: "Facturación", icon: Receipt },
  ]

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-6">
        <ConsultoritasLogo variant="sidebar" />
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu>
          {menu.map(item => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton isActive={currentView === item.id} onClick={() => onNavigate(item.id)}>
                <item.icon className="size-4" /> <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <SidebarMenuButton onClick={() => onNavigate("settings")}><Settings className="size-4" /> Configuración</SidebarMenuButton>
        <SidebarMenuButton onClick={onLogout}><LogOut className="size-4" /> Salir</SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}
