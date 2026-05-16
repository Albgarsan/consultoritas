"use client"

import { useState, useEffect } from "react"
import {
  Scale,
  Calculator,
  Briefcase,
  Gavel,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  User,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ConsultoritasLogo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefilledClientName?: string
  prefilledClientEmail?: string
  hideIdentityFields?: boolean
}

interface Advisor {
  id: string
  name: string
  role: string
  initials: string
  color: string
  isPartner: boolean
  specialties: string[]
}

const ALL_SPECIALTIES = ["fiscal", "laboral", "contable", "judicial"]

const advisoryTypes = [
  {
    id: "fiscal",
    title: "Asesoría Fiscal",
    icon: Calculator,
    description: "Impuestos, declaraciones y planificación tributaria",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
  {
    id: "laboral",
    title: "Asesoría Laboral",
    icon: Briefcase,
    description: "Contratos, nóminas y seguridad social",
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/30",
  },
  {
    id: "contable",
    title: "Asesoría Contable",
    icon: Scale,
    description: "Contabilidad, balances y cuentas anuales",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
  },
  {
    id: "judicial",
    title: "Asesoría Judicial",
    icon: Gavel,
    description: "Litigios, reclamaciones y procedimientos judiciales",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
  },
  {
    id: "general",
    title: "Asesoramiento General",
    icon: HelpCircle,
    description: "Consulta general o no sé qué tipo de asesoría necesito",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted-foreground/30",
  },
]

export function AppointmentModal({
  open,
  onOpenChange,
  prefilledClientName,
  prefilledClientEmail,
  hideIdentityFields = false,
}: AppointmentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dbAdvisors, setDbAdvisors] = useState<Advisor[]>([])

  useEffect(() => {
    if (open) {
      if (prefilledClientName) setName(prefilledClientName)
      if (prefilledClientEmail) setEmail(prefilledClientEmail)
      apiFetch("/api/users/advisors/")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data.filter(u => u.role === "Asesor" || u.is_staff)
            setDbAdvisors(filtered.map(u => ({
              id: String(u.id),
              name: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email,
              role: u.role || "Asesor",
              initials: u.first_name ? u.first_name[0] : u.email[0].toUpperCase(),
              color: "bg-primary/20 text-primary",
              isPartner: Boolean(u.is_staff),
              specialties: Array.isArray(u.specialties) && u.specialties.length > 0
                ? u.specialties
                : ALL_SPECIALTIES,
            })))
          } else {
            toast.error("No se pudieron cargar los asesores disponibles")
          }
        })
        .catch(() => toast.error("No se pudieron cargar los asesores disponibles"))
    }
  }, [open, prefilledClientName, prefilledClientEmail])

  const activeAdvisors = dbAdvisors

  const resetAndClose = () => {
    setStep(1)
    setSelectedType(null)
    setSelectedAdvisor(null)
    setSelectedDate(null)
    setSelectedTime(null)
    onOpenChange(false)
  }

  // Step 1: Select sector
  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId)
    setSelectedAdvisor(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep(2)
  }

  // Get available advisors based on selected type
  const getAvailableAdvisors = () => {
    if (!selectedType) return []

    if (selectedType === "general") {
      const partners = activeAdvisors.filter(a => a.isPartner)
      return partners.length > 0 ? partners : activeAdvisors
    }

    return activeAdvisors.filter(a => a.specialties.includes(selectedType))
  }

  const generateAvailableDates = () => {
    const dates: Date[] = []
    const current = new Date()
    let offset = 1

    while (dates.length < 20) {
      const candidate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset)
      const weekDay = candidate.getDay()
      if (weekDay !== 0 && weekDay !== 6) {
        dates.push(new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate()))
      }
      offset += 1
    }

    return dates
  }

  // Step 2: Select advisor
  const handleAdvisorSelect = (advisorId: string) => {
    setSelectedAdvisor(advisorId)
    setSelectedDate(null)
    setSelectedTime(null)
    setStep(3)
  }

  // Get available dates for selected advisor(s)
  const getAvailableDates = () => {
    if (!selectedAdvisor) return []
    return generateAvailableDates()
  }

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: Date) => {
    if (!selectedAdvisor) return []
    const isFriday = date.getDay() === 5
    const baseTimes = isFriday
      ? ["09:00", "10:00", "11:00", "12:00"]
      : ["09:00", "10:00", "11:00", "12:00", "16:00", "17:00"]

    if (selectedAdvisor === "any") {
      const availableAdvisors = getAvailableAdvisors()
      const slots: { time: string; advisorId: string; advisorName: string }[] = []
      availableAdvisors.forEach(advisor => {
        baseTimes.forEach(time => {
          slots.push({ time, advisorId: advisor.id, advisorName: advisor.name })
        })
      })
      return slots.sort((a, b) => a.time.localeCompare(b.time))
    }

    const advisor = activeAdvisors.find(a => a.id === selectedAdvisor)
    return baseTimes.map(time => ({
      time,
      advisorId: selectedAdvisor,
      advisorName: advisor?.name || ""
    }))
    .filter(slot => {
      // Exclude past times for today
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      if (!isToday) return true
      const [h, m] = slot.time.split(":").map(Number)
      const mins = h * 60 + m
      const currentMins = now.getHours() * 60 + now.getMinutes()
      return mins > currentMins + 30
    })
  }

  const handleSlotSelect = (time: string, advisorId: string) => {
    setSelectedTime(time)
    if (selectedAdvisor === "any") {
      setSelectedAdvisor(advisorId)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    for (let i = 0; i < (firstDay.getDay() || 7) - 1; i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const isDateAvailable = (date: Date) => {
    const availableDates = getAvailableDates()
    return availableDates.some(d => d.getTime() === date.getTime())
  }

  const selectedTypeData = advisoryTypes.find(t => t.id === selectedType)
  const selectedAdvisorData = activeAdvisors.find(a => a.id === selectedAdvisor)

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogDescription className="sr-only">
            Formulario para agendar una cita con Consultoritas
          </DialogDescription>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <ConsultoritasLogo variant="icon" />
              <span>Agendar Cita - Consultoritas</span>
            </DialogTitle>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: "Sector" },
              { num: 2, label: "Asesor" },
              { num: 3, label: "Fecha" },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    step >= s.num
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {step > s.num ? <Check className="size-4" /> : s.num}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div className={cn(
                    "w-12 h-0.5 transition-colors mb-5",
                    step > s.num ? "bg-accent" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Select Sector/Advisory Type */}
        {step === 1 && (
          <div className="py-6 space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Selecciona el tipo de asesoría
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Elige el área en la que necesitas ayuda
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {advisoryTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md border-2",
                    selectedType === type.id
                      ? `${type.borderColor} shadow-md`
                      : "border-border hover:border-accent/50"
                  )}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", type.bgColor)}>
                      <type.icon className={cn("size-6", type.color)} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{type.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Advisor */}
        {step === 2 && selectedType && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="size-4 mr-1" />
                Volver
              </Button>
              {selectedTypeData && (
                <Badge variant="outline" className={cn(selectedTypeData.bgColor, selectedTypeData.color)}>
                  {selectedTypeData.title}
                </Badge>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Selecciona un asesor
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedType === "general"
                  ? "Para consultas generales, nuestros socios principales te atenderán"
                  : "Elige quién te gustaría que te atienda"
                }
              </p>
            </div>

            <div className="space-y-3">
              {/* "Any" option - only for non-general types */}
              {selectedType !== "general" && (
                <Card
                  className="cursor-pointer border-2 border-border hover:border-accent/50 hover:shadow-md transition-all"
                  onClick={() => handleAdvisorSelect("any")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="size-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">Cualquier asesor disponible</h4>
                      <p className="text-sm text-muted-foreground">
                        Te asignaremos el primer asesor disponible del área
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              )}

              {/* Available advisors */}
              {getAvailableAdvisors().map((advisor) => (
                <Card
                  key={advisor.id}
                  className="cursor-pointer border-2 border-border hover:border-accent/50 hover:shadow-md transition-all"
                  onClick={() => handleAdvisorSelect(advisor.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`text-sm font-semibold ${advisor.color}`}>
                        {advisor.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{advisor.name}</h4>
                        {advisor.isPartner && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Socio
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{advisor.role}</p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && selectedAdvisor && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSelectedTime(null); setSelectedDate(null); }}>
                <ChevronLeft className="size-4 mr-1" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                {selectedTypeData && (
                  <Badge variant="outline" className={cn(selectedTypeData.bgColor, selectedTypeData.color, "text-xs")}>
                    {selectedTypeData.title}
                  </Badge>
                )}
                {selectedAdvisorData && (
                  <Badge variant="outline" className="text-xs">
                    {selectedAdvisorData.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Selecciona fecha y hora
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Elige el momento que mejor te convenga
              </p>
            </div>

            {/* Calendar */}
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="font-medium capitalize">
                  {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                  <div key={day} className="text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentMonth).map((day, i) => {
                  if (!day) {
                    return <div key={`empty-${i}`} className="aspect-square" />
                  }
                  const isAvailable = isDateAvailable(day)
                  const isSelected = selectedDate?.getTime() === day.getTime()
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={!isAvailable}
                      onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                      className={cn(
                        "aspect-square rounded-lg text-sm transition-colors",
                        isAvailable
                          ? "hover:bg-accent/20 cursor-pointer"
                          : "text-muted-foreground/40 cursor-not-allowed",
                        isSelected && "bg-accent text-accent-foreground",
                        isAvailable && !isSelected && "font-medium"
                      )}
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="size-4 text-accent" />
                  <span className="capitalize">{formatDate(selectedDate)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {getTimeSlotsForDate(selectedDate).map(({ time, advisorId, advisorName }) => (
                    <Button
                      key={`${time}-${advisorId}`}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex flex-col h-auto py-2",
                        selectedTime !== time && "hover:bg-accent/10 hover:border-accent"
                      )}
                      onClick={() => handleSlotSelect(time, advisorId)}
                    >
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Clock className="size-3" />
                        {time}
                      </span>
                      {(selectedAdvisor === "any" || !selectedAdvisorData) && (
                        <span className="text-xs text-muted-foreground">{advisorName}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Button */}
            {selectedDate && selectedTime && (
              <div className="pt-4 border-t space-y-4">
                <Card className="border-accent/30 bg-accent/5">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-foreground">Resumen de tu cita</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium text-foreground">{selectedTypeData?.title}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Asesor</p>
                        <p className="font-medium text-foreground">
                          {activeAdvisors.find(a => a.id === selectedAdvisor)?.name || selectedAdvisorData?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fecha</p>
                        <p className="font-medium text-foreground capitalize">
                          {selectedDate.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Hora</p>
                        <p className="font-medium text-foreground">{selectedTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                                                <div className="space-y-4 pt-4 border-t">
                                                {!hideIdentityFields ? (
                                                  <div className="grid gap-3">
                                                    <div className="space-y-1">
                                                      <Label>Nombre completo</Label>
                                                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Ana Garcia" />
                                                    </div>
                                                    <div className="space-y-1">
                                                      <Label>Correo electrónico</Label>
                                                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@ejemplo.com" />
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <Card className="border-border/50 bg-muted/30">
                                                    <CardContent className="p-4 grid gap-1 text-sm">
                                                      <p className="text-muted-foreground">Cliente</p>
                                                      <p className="font-medium">{prefilledClientName || name || "Cliente"}</p>
                                                      <p className="text-muted-foreground mt-2">Correo</p>
                                                      <p className="font-medium">{prefilledClientEmail || email || "-"}</p>
                                                    </CardContent>
                                                  </Card>
                                                )}
                  <div className="text-sm text-center text-muted-foreground">
                                                  {!hideIdentityFields && <>¿Ya tienes cuenta? <a href="/login" className="text-accent underline font-medium cursor-pointer">Iniciar sesión</a></>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => { setSelectedTime(null); setSelectedDate(null); }}>
                      Modificar
                    </Button>
                    <Button
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={hideIdentityFields ? (!selectedDate || !selectedTime) : (!name || !email || !selectedDate || !selectedTime)}
                      onClick={async () => {
                        try {
                            // Validate selected datetime is in the future
                            if (!selectedDate || !selectedTime) {
                              toast.error('Selecciona fecha y hora válidas')
                              return
                            }
                            const [sh, sm] = selectedTime.split(":").map(Number)
                            const scheduled = new Date(selectedDate)
                            scheduled.setHours(sh, sm, 0, 0)
                            if (scheduled.getTime() <= Date.now()) {
                              toast.error('No puedes agendar una cita en el pasado')
                              return
                            }

                            const res = await apiFetch("/api/business/appointments/", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                advisor_id: selectedAdvisor,
                                appointment_type: selectedTypeData?.title || "General",
                                client_name: name,
                                client_email: email,
                                date: selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined,
                                time: selectedTime,
                              }),
                            })
                          if (res.ok) {
                            toast.success('Reserva confirmada con éxito')
                            window.dispatchEvent(new Event("consultoritas:appointments-updated"))
                            resetAndClose()
                          } else {
                            const errorData = await res.json().catch(() => ({}))
                            toast.error(errorData.detail || errorData.error || errorData.scheduled_at || 'Error al confirmar la reserva')
                          }
                        } catch {
                          toast.error('Error de red')
                        }
                      }}>
                      Confirmar Cita
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
