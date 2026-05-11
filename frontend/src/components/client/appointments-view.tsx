"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar as CalendarIcon, Clock, Loader2, MoreHorizontal, Plus, Trash2, User } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { AppointmentModal } from "@/components/shared/modals/appointment-modal"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type AppointmentStatus = "confirmed" | "pending" | "cancelled"

type AppointmentItem = {
  id: string
  client_name: string
  client_email: string
  appointment_type: string
  scheduled_at: string
  status: AppointmentStatus
  advisor?: {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    work_start?: string | null
    work_end?: string | null
    work_schedule?: Record<string, { enabled?: boolean; slots?: Array<{ start: string; end: string }> }>
  }
}

function normalizeStatus(status: string | undefined): AppointmentStatus {
  const normalized = (status || "").toLowerCase()
  if (["confirmed", "confirmada", "confirmado", "aceptada", "accepted"].includes(normalized)) return "confirmed"
  if (["cancelled", "cancelada", "rechazada", "declined"].includes(normalized)) return "cancelled"
  return "pending"
}

function parseMinutes(value: string | null | undefined) {
  if (!value) return null
  const [hours, minutes] = value.split(":").map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function statusLabel(status: AppointmentStatus) {
  if (status === "confirmed") return { label: "Confirmada", className: "bg-emerald-500/10 text-emerald-600 border-0" }
  if (status === "cancelled") return { label: "Cancelada", className: "bg-rose-500/10 text-rose-600 border-0" }
  return { label: "Pendiente", className: "bg-amber-500/10 text-amber-600 border-0" }
}

export function ClientAppointmentsView({
  appointments = [],
  user,
}: {
  appointments?: Array<Record<string, unknown>>
  user?: { first_name?: string; last_name?: string; email?: string } | null
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined)
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const handleUpdate = () => {
      window.dispatchEvent(new Event("consultoritas:refresh"))
    }
    window.addEventListener("consultoritas:appointments-updated", handleUpdate)
    return () => window.removeEventListener("consultoritas:appointments-updated", handleUpdate)
  }, [])

  const currentAppointments = useMemo<AppointmentItem[]>(() => {
    const now = new Date()
    const normalized = appointments
      .map((raw) => {
        const record = raw as Record<string, unknown>
        const advisorRecord = (record.advisor || {}) as Record<string, unknown>
        const scheduledAt = new Date(String(record.scheduled_at || record.date || record.datetime || ""))
        if (Number.isNaN(scheduledAt.getTime())) return null
        return {
          id: String(record.id || ""),
          client_name: String(record.client_name || record.client || user?.first_name || user?.email || "Cliente"),
          client_email: String(record.client_email || user?.email || ""),
          appointment_type: String(record.appointment_type || record.type || "General"),
          scheduled_at: scheduledAt.toISOString(),
          status: normalizeStatus(String(record.status || "")),
          advisor: record.advisor
            ? {
                id: advisorRecord.id as string | undefined,
                first_name: advisorRecord.first_name as string | undefined,
                last_name: advisorRecord.last_name as string | undefined,
                email: advisorRecord.email as string | undefined,
                work_start: (advisorRecord.work_start as string | null) || null,
                work_end: (advisorRecord.work_end as string | null) || null,
                work_schedule: (advisorRecord.work_schedule as Record<string, { enabled?: boolean; slots?: Array<{ start: string; end: string }> }>) || {},
              }
            : undefined,
        }
      })
      .filter(Boolean) as AppointmentItem[]
      // Solo mostrar citas futuras (no pasadas)
      const future = normalized.filter((a) => new Date(a.scheduled_at).getTime() > now.getTime())
      return future.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }, [appointments, user])

  const selectedUserName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Cliente"

  const handleDelete = async (appointment: AppointmentItem) => {
    if (!window.confirm("¿Cancelar esta cita?")) return

    try {
      const response = await apiFetch(`/api/business/appointments/${appointment.id}/`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.scheduled_at || "No se pudo cancelar la cita")
      }
      toast.success("Cita cancelada")
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la cita")
    }
  }

  const getAvailableTimes = (date: Date) => {
    if (!selectedAppointment?.advisor) return []

    const advisor = selectedAppointment.advisor
    const dayOfWeek = date.getDay()
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    const dayKey = dayNames[dayOfWeek]
    const schedule = advisor.work_schedule || {}
    const dayCfg = schedule[dayKey]

    // Deshabilitar sábado (6) y domingo (0) si el asesor no tiene configuración
    const isSaturdayOrSunday = dayOfWeek === 0 || dayOfWeek === 6
    if (isSaturdayOrSunday && (!dayCfg || (dayCfg && !dayCfg.enabled))) {
      return [] // No hay horarios disponibles
    }

    let times: string[] = []
    const baseInterval = 60 // 1 hora

    if (dayCfg && Array.isArray(dayCfg.slots) && dayCfg.slots.length > 0) {
      // Si tiene slots definidos
      dayCfg.slots.forEach((slot) => {
        const [startH, startM] = slot.start.split(":").map(Number)
        const [endH, endM] = slot.end.split(":").map(Number)
        const startMins = startH * 60 + startM
        const endMins = endH * 60 + endM
        for (let min = startMins; min < endMins; min += baseInterval) {
          const h = Math.floor(min / 60)
          const m = min % 60
          times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
        }
      })
    } else if (advisor.work_start && advisor.work_end) {
      // Horario general
      const startMins = parseMinutes(advisor.work_start) || 9 * 60
      const endMins = parseMinutes(advisor.work_end) || 18 * 60
      for (let min = startMins; min < endMins; min += baseInterval) {
        const h = Math.floor(min / 60)
        const m = min % 60
        times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
      }
    } else {
      // Default
      times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
    }

    // Excluir horas pasadas del día actual
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      const currentMins = currentHour * 60 + currentMin
      times = times.filter((t) => {
        const [h, m] = t.split(":").map(Number)
        return (h * 60 + m) > currentMins + 30
      })
    }

    // Excluir horas con citas ya agendadas
    const dayAppointments = currentAppointments.filter((a) => {
      const aDate = new Date(a.scheduled_at)
      return aDate.toDateString() === date.toDateString()
    })

    times = times.filter((t) => {
      const [h, m] = t.split(":").map(Number)
      return !dayAppointments.some((a) => {
        const aDate = new Date(a.scheduled_at)
        const aH = aDate.getHours()
        const aM = aDate.getMinutes()
        return aH === h && aM === m
      })
    })

    return times
  }

  const handleOpenReschedule = (appointment: AppointmentItem) => {
    setSelectedAppointment(appointment)
    const date = new Date(appointment.scheduled_at)
    setRescheduleDate(date)
    setRescheduleTime(null)
    setRescheduleOpen(true)
  }

  const handleReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return

    const [hours, minutes] = rescheduleTime.split(":").map(Number)
    const scheduled = new Date(rescheduleDate)
    scheduled.setHours(hours, minutes, 0, 0)

    // Prevent scheduling into the past
    if (scheduled.getTime() <= Date.now()) {
      toast.error("No puedes reprogramar una cita a una fecha u hora pasada")
      return
    }

    setIsSaving(true)
    try {
      const response = await apiFetch(`/api/business/appointments/${selectedAppointment.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduled.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.scheduled_at || errorData.detail || "No se pudo reprogramar la cita")
      }

      toast.success("Cita reprogramada")
      window.dispatchEvent(new Event("consultoritas:appointments-updated"))
      setRescheduleOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reprogramar la cita")
    } finally {
      setIsSaving(false)
    }
  }

  const availableTimes = rescheduleDate ? getAvailableTimes(rescheduleDate) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Mis Citas</h2>
          <p className="text-muted-foreground">Agenda nuevas citas y gestiona las que ya tienes programadas.</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Agendar nueva cita
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Próximas citas</CardTitle>
          <CardDescription>Las citas se muestran ordenadas por fecha y hora.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {currentAppointments.length > 0 ? (
            <div className="divide-y divide-border">
              {currentAppointments.map((appointment) => {
                const status = statusLabel(appointment.status)
                const advisorName = [appointment.advisor?.first_name, appointment.advisor?.last_name].filter(Boolean).join(" ") || appointment.advisor?.email || "Asesor"
                return (
                  <div key={appointment.id} className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarIcon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{appointment.appointment_type}</h3>
                          <Badge variant="outline" className={cn("border-0", status.className)}>{status.label}</Badge>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2"><Clock className="size-4" /> {formatDate(appointment.scheduled_at)} a las {formatTime(appointment.scheduled_at)}</p>
                          <p className="flex items-center gap-2"><User className="size-4" /> {advisorName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-9">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenReschedule(appointment)}>
                            <Clock className="size-4 mr-2" /> Reprogramar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(appointment)}>
                            <Trash2 className="size-4 mr-2" /> Cancelar cita
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="size-14 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <CalendarIcon className="size-6" />
              </div>
              <div>
                <p className="font-medium text-foreground">Todavía no tienes citas</p>
                <p className="text-sm text-muted-foreground">Agrega tu primera cita con el botón superior.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AppointmentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefilledClientName={selectedUserName}
        prefilledClientEmail={user?.email}
        hideIdentityFields
      />

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reprogramar cita</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedAppointment && (
              <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-1">
                <p><strong>Asesor:</strong> {[selectedAppointment.advisor?.first_name, selectedAppointment.advisor?.last_name].filter(Boolean).join(" ") || selectedAppointment.advisor?.email || "Asesor"}</p>
                <p><strong>Tipo:</strong> {selectedAppointment.appointment_type}</p>
                <p><strong>Cita actual:</strong> {formatDate(selectedAppointment.scheduled_at)} a las {formatTime(selectedAppointment.scheduled_at)}</p>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Selecciona nueva fecha y hora</h3>
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
                  disabled={(date) => {
                    if (date < new Date()) return true
                    // Deshabilitar sábados (6) y domingos (0) si el asesor no trabaja esos días
                    const dayOfWeek = date.getDay()
                    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
                    const dayKey = dayNames[dayOfWeek]
                    const schedule = selectedAppointment?.advisor?.work_schedule || {}
                    const dayCfg = schedule[dayKey]
                    const isSaturdayOrSunday = dayOfWeek === 0 || dayOfWeek === 6
                    if (isSaturdayOrSunday && (!dayCfg || (dayCfg && !dayCfg.enabled))) {
                      return true
                    }
                    return false
                  }}
                />
              </div>

              {rescheduleDate && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium">
                    Horarios disponibles el {formatDate(rescheduleDate.toISOString())}:
                  </p>
                  {availableTimes.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={rescheduleTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setRescheduleTime(time)}
                          className="text-sm"
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      No hay horarios disponibles para esta fecha. Elige otro día.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleReschedule}
                disabled={isSaving || !rescheduleTime}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CalendarIcon className="size-4" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
