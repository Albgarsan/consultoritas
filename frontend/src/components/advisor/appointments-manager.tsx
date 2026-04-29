"use client"

import { useState } from "react"
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  MoreHorizontal,
  Trash2,
  Edit2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Settings2
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Mock de citas
const mockAppointments = [
  { id: "1", client: "María Castro", type: "Fiscal", date: new Date(2026, 2, 20, 10, 0), status: "confirmed" },
  { id: "2", client: "Tech Solutions SL", type: "Laboral", date: new Date(2026, 2, 20, 12, 30), status: "pending" },
  { id: "3", client: "Bar El Rincón", type: "Jurídica", date: new Date(2026, 2, 21, 0, 0), status: "confirmed" },
  { id: "4", client: "Miguel Fernández", type: "General", date: new Date(2026, 2, 22, 16, 0), status: "cancelled" },
]

export function AppointmentsManager({ onNavigateToSettings }: { onNavigateToSettings: () => void }) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Filtrar citas por el día seleccionado en el calendario
  const selectedDayAppointments = mockAppointments.filter(app =>
    app.date.toDateString() === date?.toDateString()
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Citas</h2>
          <p className="text-muted-foreground text-sm text-pretty">Visualiza tu agenda y gestiona las solicitudes de tus clientes.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={onNavigateToSettings}>
          <Settings2 className="size-4" /> Configurar mi Horario
        </Button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Calendario Mensual */}
        <Card className="lg:col-span-5 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Calendario Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent/20 text-accent font-bold",
              }}
            />
          </CardContent>
        </Card>

        {/* Agenda del Día */}
        <Card className="lg:col-span-7 border-border/50 shadow-sm flex flex-col">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Agenda del Día</CardTitle>
                <CardDescription>
                  {date?.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {selectedDayAppointments.length} Eventos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto max-h-[400px]">
            {selectedDayAppointments.length > 0 ? (
              <div className="divide-y divide-border">
                {selectedDayAppointments.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16">
                        <p className="text-sm font-bold text-slate-900">
                          {app.date.getHours()}:{app.date.getMinutes().toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Hora</p>
                      </div>
                      <Separator orientation="vertical" className="h-10" />
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-2">
                          {app.client}
                          {app.status === 'confirmed' && <CheckCircle2 className="size-3 text-emerald-500" />}
                          {app.status === 'pending' && <Clock className="size-3 text-amber-500" />}
                          {app.status === 'cancelled' && <XCircle className="size-3 text-rose-500" />}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="size-3" /> {app.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8 text-slate-500"><Edit2 className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-rose-500"><Trash2 className="size-4" /></Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Reprogramar</DropdownMenuItem>
                          <DropdownMenuItem>Confirmar asistencia</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Cancelar Cita</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <CalendarIcon className="size-8 text-slate-300" />
                </div>
                <p className="font-medium text-slate-500">No hay citas para este día</p>
                <p className="text-sm text-slate-400">Tus clientes verán este día como disponible en la web.</p>
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t bg-slate-50/50">
             <Button className="w-full bg-primary gap-2">
               <Plus className="size-4" /> Crear Cita Manual
             </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Separator({ orientation = "horizontal", className }: { orientation?: "horizontal" | "vertical", className?: string }) {
  return (
    <div className={cn(
      "bg-border shrink-0",
      orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full",
      className
    )} />
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  )
}
