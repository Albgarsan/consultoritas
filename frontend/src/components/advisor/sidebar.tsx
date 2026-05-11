"use client"

import {
  LayoutDashboard,
  Users,
  FileCheck,
  Bot,
  Receipt,
  Settings,
  LogOut,
  CalendarDays,
  CheckSquare
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { ConsultoritasLogo } from "@/components/layout/logo"

export function AdvisorSidebar({ currentView, onNavigate, onLogout }: any) {
  const menu = [
    { id: "dashboard", label: "Dashboard Global", icon: LayoutDashboard },
    { id: "clientes", label: "Gestión Clientes", icon: Users },
    { id: "citas", label: "Agenda y Citas", icon: CalendarDays },
    { id: "validacion", label: "Validar Facturas", icon: FileCheck },
    { id: "monitor-ia", label: "Monitor IA", icon: Bot },
    { id: "facturacion", label: "Facturación Despacho", icon: Receipt },
    { id: "compliance", label: "Calendario Fiscal", icon: CheckSquare },
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
              <SidebarMenuButton
                isActive={currentView === item.id}
                onClick={() => onNavigate(item.id)}
                className="transition-all duration-200"
              >
                <item.icon className="size-4" />
                <span className="font-medium">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentView === "settings"}
              onClick={() => onNavigate("settings")}
            >
              <Settings className="size-4" />
              <span>Configuración</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              <span>Salir</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
