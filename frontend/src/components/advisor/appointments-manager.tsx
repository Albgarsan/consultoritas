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
import { useApiData } from "@/lib/use-api"

type AppointmentStatus = "confirmed" | "pending" | "cancelled"

type Appointment = {
  id: string
  client: string
  type: string
  date: Date
  status: AppointmentStatus
}

type AppointmentApiRow = {
  id: string | number
  client_name?: string
  client?: string
  business_name?: string
  appointment_type?: string
  type?: string
  scheduled_at?: string
  date?: string
  datetime?: string
  status?: string
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
type CurrentUser = {
  id?: string
  first_name?: string
  email?: string
  work_start?: string | null
  work_end?: string | null
  work_schedule?: WorkSchedule
}

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

function getCurrentTimestamp() {
  return Date.now()
}

function formatLocalIsoWithOffset(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  const seconds = pad(d.getSeconds())
  const tzOffsetMin = -d.getTimezoneOffset()
  const sign = tzOffsetMin >= 0 ? "+" : "-"
  const absMin = Math.abs(tzOffsetMin)
  const tzHours = pad(Math.floor(absMin / 60))
  const tzMins = pad(absMin % 60)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${tzHours}:${tzMins}`
}

export function AppointmentsManager({
  appointments = [],
  currentUser,
  businessId,
  onNavigateToSettings,
}: {
  appointments?: AppointmentApiRow[]
  currentUser?: CurrentUser | null
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
  const [rescheduleWarningAccepted, setRescheduleWarningAccepted] = useState(false)

  const { data: fetchedAppointments = [], mutate: mutateAppointments } = useApiData<AppointmentApiRow[]>(
    "/api/business/appointments/",
    { dedupingInterval: 5000 }
  )

  const { data: fetchedUser } = useApiData<CurrentUser>("/api/users/me/")

  const activeAppointments = appointments.length > 0 ? appointments : fetchedAppointments
  const activeUser = currentUser || fetchedUser
  const workStart = activeUser?.work_start || null
  const workEnd = activeUser?.work_end || null
  const workSchedule = activeUser?.work_schedule && typeof activeUser.work_schedule === "object" ? activeUser.work_schedule : {}
  const now = new Date()

  useEffect(() => {
    const handleRefresh = () => {
      void mutateAppointments()
    }
    window.addEventListener("consultoritas:appointments-updated", handleRefresh)
    window.addEventListener("consultoritas:refresh", handleRefresh)
    return () => {
      window.removeEventListener("consultoritas:appointments-updated", handleRefresh)
      window.removeEventListener("consultoritas:refresh", handleRefresh)
    }
  }, [mutateAppointments])

  const parsedAppointments: Appointment[] = activeAppointments
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

  const selectedDayAppointments = parsedAppointments.filter((app) => app.date.toDateString() === date?.toDateString())

  const meetingDays = parsedAppointments.map((app) => app.date)
  const pendingMeetingDays = parsedAppointments.filter((app) => app.status === "pending").map((app) => app.date)
  const upcomingAppointments = [...parsedAppointments]
    .filter((app) => app.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 12)

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
      await mutateAppointments()
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
      await mutateAppointments()
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
      const [h, m] = rescheduleTime.split(":").map((x) => parseInt(x, 10))
      const scheduled = new Date(rescheduleDate)
      scheduled.setHours(h, m, 0, 0)

      if (scheduled.getTime() <= getCurrentTimestamp()) {
        toast.error("No puedes reprogramar una cita a una fecha u hora pasada")
        return
      }

      const scheduledTs = scheduled.getTime()
      const conflict = parsedAppointments.some((a) => a.id !== rescheduleAppointment.id && Math.abs(a.date.getTime() - scheduledTs) < 1000 * 60)
      if (conflict) {
        toast.error("Ya hay una cita programada para ese momento")
        return
      }

      let forceOutOfHours = false
      const outside = isOutOfHours(scheduled, workSchedule, workStart, workEnd)
      if (outside && !rescheduleWarningAccepted) {
        toast.error("Debes confirmar el aviso de horario antes de reprogramar")
        return
      }
      if (outside) {
        forceOutOfHours = true
      }

      await mutateAppointment(rescheduleAppointment.id, {
        scheduled_at: formatLocalIsoWithOffset(scheduled),
        force_out_of_hours: forceOutOfHours,
      })
      toast.success("Cita reprogramada")
      await mutateAppointments()
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

    if (!activeUser?.id) {
      toast.error("No se pudo identificar al asesor actual")
      return
    }

    setIsCreating(true)
    try {
      let scheduledAt: string | null = null
      if (manualAppointment.date && manualAppointment.time) {
        const parts = manualAppointment.date.split("-").map((x) => Number(x))
        if (parts.length === 3) {
          const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1)
          const scheduled = buildDateFromParts(d, manualAppointment.time)
          scheduledAt = formatLocalIsoWithOffset(scheduled)
        }
      }

      const response = await apiFetch("/api/business/appointments/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_id: activeUser.id,
          business_id: businessId || undefined,
          client_name: manualAppointment.client_name,
          client_email: manualAppointment.client_email,
          appointment_type: manualAppointment.appointment_type,
          scheduled_at: scheduledAt,
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
      await mutateAppointments()
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
              modifiers={{
                meeting: meetingDays,
                pendingMeeting: pendingMeetingDays,
              }}
              modifiersClassNames={{
                meeting: "bg-sky-100 text-sky-700 font-semibold",
                pendingMeeting: "bg-amber-100 text-amber-700 font-semibold",
              }}
              className="rounded-md border-0"
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent/20 text-accent font-bold",
              }}
            />
          </CardContent>
          <div className="px-4 pb-4 text-xs text-muted-foreground flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-sky-500" /> Días con cita</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-500" /> Pendientes</span>
          </div>
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

                    {(() => {
                      const isPastAppointment = app.date.getTime() < now.getTime()

                      return (
                        <div className="flex items-center gap-2">
                          <div className="hidden group-hover:flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-slate-500"
                              onClick={() => handleRescheduleAppointment(app)}
                              disabled={isPastAppointment}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-rose-500"
                              onClick={() => handleDeleteAppointment(app.id)}
                              disabled={isPastAppointment}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleConfirmAppointment(app.id)}>Confirmar asistencia</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAppointment(app.id)} disabled={isPastAppointment}>Cancelar Cita</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })()}
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

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Próximas Citas</CardTitle>
          <CardDescription>Lista continua con los próximos compromisos del despacho.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[280px] overflow-y-auto">
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas próximas registradas.</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((app) => (
                <div key={`upcoming-${app.id}`} className="rounded-md border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{app.client}</p>
                    <p className="text-xs text-muted-foreground">{app.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{app.date.toLocaleDateString("es-ES")}</p>
                    <p className="text-xs text-muted-foreground">{app.date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
