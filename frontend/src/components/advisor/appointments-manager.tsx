"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  MoreHorizontal,
  Trash2,
  Edit2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Settings2,
  Loader2
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

type AppointmentStatus = "confirmed" | "pending" | "cancelled"

type Appointment = {
  id: string
  client: string
  type: string
  date: Date
  status: AppointmentStatus
}

function normalizeStatus(status: string | undefined): AppointmentStatus {
  const normalized = status?.toLowerCase()
  if (["confirmed", "confirmada", "confirmado", "aceptada", "accepted"].includes(normalized || "")) {
    return "confirmed"
  }
  if (["cancelled", "cancelada", "rechazada", "declined"].includes(normalized || "")) {
    return "cancelled"
  }
  return "pending"
}

type Slot = { start: string; end: string }
type DaySchedule = { enabled?: boolean; slots?: Slot[] }
type WorkSchedule = Record<string, DaySchedule>

function parseMinutes(value: string | null | undefined) {
  if (!value) return null
  const [hours, minutes] = value.split(":").map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function isOutOfHours(date: Date, workSchedule: WorkSchedule, workStart: string | null, workEnd: string | null) {
  const dayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][date.getDay()]
  const localMinutes = date.getHours() * 60 + date.getMinutes()
  const dayCfg = workSchedule[dayKey]

  if (dayCfg && Array.isArray(dayCfg.slots) && dayCfg.slots.length > 0) {
    if (dayCfg.enabled === false) return true
    return !dayCfg.slots.some((slot) => {
      const start = parseMinutes(slot.start)
      const end = parseMinutes(slot.end)
      if (start === null || end === null) return false
      return start <= localMinutes && localMinutes <= end
    })
  }

  const start = parseMinutes(workStart)
  const end = parseMinutes(workEnd)
  if (start === null || end === null) return false
  return localMinutes < start || localMinutes > end
}

function buildDateFromParts(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map((part) => Number(part))
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function AppointmentsManager({
  appointments = [],
  currentUser,
  businessId,
  onNavigateToSettings,
}: {
  appointments?: any[]
  currentUser?: { id?: string; first_name?: string; email?: string } | null
  businessId?: string
  onNavigateToSettings: () => void
}) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [isCreating, setIsCreating] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualAppointment, setManualAppointment] = useState({
    client_name: "",
    client_email: "",
    appointment_type: "general",
    date: "",
    time: "",
  })
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined)
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [workStart, setWorkStart] = useState<string | null>(null)
  const [workEnd, setWorkEnd] = useState<string | null>(null)
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>({})
  const [rescheduleWarningAccepted, setRescheduleWarningAccepted] = useState(false)

  // Load advisor settings (work hours)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await apiFetch('/api/users/me/')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return
        setWorkStart(data.work_start || null)
        setWorkEnd(data.work_end || null)
        setWorkSchedule((data.work_schedule && typeof data.work_schedule === "object") ? data.work_schedule : {})
      } catch {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  const parsedAppointments: Appointment[] = appointments
    .map((raw) => {
      const appointmentDate = new Date(raw.scheduled_at || raw.date || raw.datetime)
      if (Number.isNaN(appointmentDate.getTime())) {
        return null
      }

      return {
        id: String(raw.id),
        client: raw.client_name || raw.client || raw.business_name || "Cliente",
        type: raw.appointment_type || raw.type || "General",
        date: appointmentDate,
        status: normalizeStatus(raw.status),
      }
    })
    .filter((item): item is Appointment => item !== null)

  // Filtrar citas por el día seleccionado en el calendario
  const selectedDayAppointments = parsedAppointments.filter(app =>
    app.date.toDateString() === date?.toDateString()
  )

  const mutateAppointment = async (appointmentId: string, payload?: Record<string, unknown>, method: "PATCH" | "DELETE" = "PATCH") => {
    const response = await apiFetch(`/api/business/appointments/${appointmentId}/`, {
      method,
      headers: method === "DELETE" ? undefined : { "Content-Type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(payload || {}),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.status || errorData.scheduled_at || "No se pudo completar la acción")
    }
  }

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await mutateAppointment(appointmentId, { status: "confirmed" })
      toast.success("Cita confirmada")
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la cita")
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm("¿Eliminar esta cita?")) return

    try {
      await mutateAppointment(appointmentId, undefined, "DELETE")
      toast.success("Cita eliminada")
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la cita")
    }
  }

  const handleRescheduleAppointment = (appointment: Appointment) => {
    setRescheduleAppointment(appointment)
    setRescheduleDate(appointment.date)
    const hours = appointment.date.getHours().toString().padStart(2, "0")
    const minutes = appointment.date.getMinutes().toString().padStart(2, "0")
    setRescheduleTime(`${hours}:${minutes}`)
    setRescheduleWarningAccepted(false)
    setRescheduleOpen(true)
  }

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppointment || !rescheduleDate || !rescheduleTime) return

    setIsRescheduling(true)
    try {
      // Build scheduled Date from selected date + time in client's local timezone
      const [h, m] = rescheduleTime.split(":").map((x) => parseInt(x, 10))
      const scheduled = new Date(rescheduleDate)
      scheduled.setHours(h)
      scheduled.setMinutes(m)
      scheduled.setSeconds(0)
      scheduled.setMilliseconds(0)

      // Prevent scheduling into the past
      if (scheduled.getTime() <= Date.now()) {
        toast.error("No puedes reprogramar una cita a una fecha u hora pasada")
        return
      }

      // Check for collisions (exclude the appointment being rescheduled)
      const scheduledTs = scheduled.getTime()
      const conflict = parsedAppointments.some((a) => a.id !== rescheduleAppointment.id && Math.abs(a.date.getTime() - scheduledTs) < 1000 * 60)
      if (conflict) {
        toast.error("Ya hay una cita programada para ese momento")
        return
      }

      // Check against advisor working hours if configured
      let forceOutOfHours = false
      const outside = isOutOfHours(scheduled, workSchedule, workStart, workEnd)
      if (outside && !rescheduleWarningAccepted) {
        toast.error("Debes confirmar el aviso de horario antes de reprogramar")
        return
      }
      if (outside) {
        forceOutOfHours = true
      }

      // Send scheduled_at as ISO so server parses timezone correctly
      await mutateAppointment(rescheduleAppointment.id, {
        scheduled_at: scheduled.toISOString(),
        force_out_of_hours: forceOutOfHours,
      })
      toast.success("Cita reprogramada")
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
      setRescheduleOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reprogramar la cita")
    } finally {
      setIsRescheduling(false)
    }
  }

  const needsWarningConfirmation = Boolean(
    rescheduleDate &&
    rescheduleTime &&
    isOutOfHours(buildDateFromParts(rescheduleDate, rescheduleTime), workSchedule, workStart, workEnd)
  )

  const handleCreateManualAppointment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.id) {
      toast.error("No se pudo identificar al asesor actual")
      return
    }

    setIsCreating(true)
    try {
      const response = await apiFetch("/api/business/appointments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_id: currentUser.id,
          business_id: businessId || undefined,
          client_name: manualAppointment.client_name,
          client_email: manualAppointment.client_email,
          appointment_type: manualAppointment.appointment_type,
          date: manualAppointment.date,
          time: manualAppointment.time,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail ||
          errorData.scheduled_at ||
          errorData.advisor_id ||
          errorData.business_id ||
          JSON.stringify(errorData) ||
          "No se pudo crear la cita"
        )
      }

      toast.success("Cita creada correctamente")
      setManualOpen(false)
      setManualAppointment({
        client_name: "",
        client_email: "",
        appointment_type: "general",
        date: "",
        time: "",
      })
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la cita")
    } finally {
      setIsCreating(false)
    }
  }

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
                        <Button variant="ghost" size="icon" className="size-8 text-slate-500" onClick={() => handleRescheduleAppointment(app)}><Edit2 className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-rose-500" onClick={() => handleDeleteAppointment(app.id)}><Trash2 className="size-4" /></Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRescheduleAppointment(app)}>Reprogramar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConfirmAppointment(app.id)}>Confirmar asistencia</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAppointment(app.id)}>Cancelar Cita</DropdownMenuItem>
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
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary gap-2">
                  <Plus className="size-4" /> Crear Cita Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva cita manual</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateManualAppointment} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Input
                      value={manualAppointment.client_name}
                      onChange={(e) => setManualAppointment((current) => ({ ...current, client_name: e.target.value }))}
                      placeholder="Nombre completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={manualAppointment.client_email}
                      onChange={(e) => setManualAppointment((current) => ({ ...current, client_email: e.target.value }))}
                      placeholder="cliente@ejemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de cita</Label>
                    <Input
                      value={manualAppointment.appointment_type}
                      onChange={(e) => setManualAppointment((current) => ({ ...current, appointment_type: e.target.value }))}
                      placeholder="fiscal, laboral, contable, judicial..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={manualAppointment.date}
                        onChange={(e) => setManualAppointment((current) => ({ ...current, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={manualAppointment.time}
                        onChange={(e) => setManualAppointment((current) => ({ ...current, time: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isCreating}>
                    {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Crear cita
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reprogramar cita</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {rescheduleAppointment && (
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Cliente:</strong> {rescheduleAppointment.client}</p>
                      <p><strong>Tipo:</strong> {rescheduleAppointment.type}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Selecciona nueva fecha</Label>
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={rescheduleDate}
                        onSelect={setRescheduleDate}
                        className="rounded-md border"
                        classNames={{
                          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                          day_today: "bg-accent/20 text-accent font-bold",
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-time">Hora</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      required
                    />
                  </div>
                  {needsWarningConfirmation && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <p className="font-medium text-amber-900">
                        Esta intentando reprogramar la cita para un momento en el que no se encuentra en la oficina, esta seguro?
                      </p>
                      <label className="flex items-start gap-3 text-sm text-amber-900">
                        <input
                          type="checkbox"
                          checked={rescheduleWarningAccepted}
                          onChange={(e) => setRescheduleWarningAccepted(e.target.checked)}
                          className="mt-1"
                        />
                        <span>Confirmo que deseo continuar con esta reprogramacion fuera de horario.</span>
                      </label>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmReschedule} disabled={isRescheduling || (needsWarningConfirmation && !rescheduleWarningAccepted)} className="gap-2">
                      {isRescheduling ? <Loader2 className="size-4 animate-spin" /> : <CalendarIcon className="size-4" />}
                      Reprogramar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
