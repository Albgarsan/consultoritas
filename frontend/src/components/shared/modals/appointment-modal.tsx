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
  is_on_vacation: boolean
  specialties: string[]
}

const ALL_SPECIALTIES = ["fiscal", "laboral", "contable", "judicial"]

const advisoryTypes = [
  {
    id: "general",
    title: "Asesoramiento General",
    icon: HelpCircle,
    description: "Consulta general o no sé qué tipo de asesoría necesito",
    color: "text-[#173d77]",
    bgColor: "bg-[#173d77]/5",
    borderColor: "border-[#173d77]/20",
  },
  {
    id: "fiscal",
    title: "Asesoría Fiscal",
    icon: Calculator,
    description: "Impuestos, declaraciones y planificación tributaria",
    color: "text-[#173d77]",
    bgColor: "bg-[#173d77]/5",
    borderColor: "border-[#173d77]/20",
  },
  {
    id: "laboral",
    title: "Asesoría Laboral",
    icon: Briefcase,
    description: "Contratos, nóminas y seguridad social",
    color: "text-[#173d77]",
    bgColor: "bg-[#173d77]/5",
    borderColor: "border-[#173d77]/20",
  },
  {
    id: "contable",
    title: "Asesoría Contable",
    icon: Scale,
    description: "Contabilidad, balances y cuentas anuales",
    color: "text-[#173d77]",
    bgColor: "bg-[#173d77]/5",
    borderColor: "border-[#173d77]/20",
  },
  {
    id: "judicial",
    title: "Asesoría Judicial",
    icon: Gavel,
    description: "Litigios, reclamaciones y procedimientos judiciales",
    color: "text-[#173d77]",
    bgColor: "bg-[#173d77]/5",
    borderColor: "border-[#173d77]/20",
  },
]

function formatLocalIsoWithOffset(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  const tzOffsetMin = -date.getTimezoneOffset()
  const sign = tzOffsetMin >= 0 ? "+" : "-"
  const absOffset = Math.abs(tzOffsetMin)
  const offsetHours = pad(Math.floor(absOffset / 60))
  const offsetMinutes = pad(absOffset % 60)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`
}

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
              color: "bg-[#173d77]/10 text-[#173d77]",
              isPartner: Boolean(u.is_staff),
              is_on_vacation: Boolean(u.is_on_vacation),
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
  const getMatchingAdvisors = () => {
    if (!selectedType) return []

    if (selectedType === "general") {
      const partners = activeAdvisors.filter(a => a.isPartner)
      return partners.length > 0 ? partners : activeAdvisors
    }

    return activeAdvisors.filter(a => a.specialties.includes(selectedType))
  }

  const getAvailableAdvisors = () => getMatchingAdvisors().filter((advisor) => !advisor.is_on_vacation)

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
    const advisor = activeAdvisors.find((item) => item.id === advisorId)
    if (advisor?.is_on_vacation) return
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-slate-200 bg-white p-0 shadow-2xl sm:rounded-[2rem]">
        <div className="relative overflow-hidden rounded-[2rem]">
          <div className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#173d77] via-sky-500 to-[#173d77]" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

        <DialogHeader className="border-b border-slate-200 px-6 pb-4 pt-6 md:px-8">
          <DialogDescription className="sr-only">
            Formulario para agendar una cita con Consultoritas
          </DialogDescription>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-[#173d77]">
              <ConsultoritasLogo variant="icon" />
              <span>Agendar Cita - Consultoritas</span>
            </DialogTitle>
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center gap-2">
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
                      ? "bg-[#173d77] text-white"
                      : "bg-slate-100 text-slate-500"
                  )}>
                    {step > s.num ? <Check className="size-4" /> : s.num}
                  </div>
                  <span className="mt-1 text-xs text-slate-500">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div className={cn(
                    "w-12 h-0.5 transition-colors mb-5",
                    step > s.num ? "bg-[#173d77]" : "bg-slate-200"
                  )} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Select Sector/Advisory Type */}
        <div className="px-6 pb-6 md:px-8">
        {step === 1 && (
          <div className="space-y-4 py-6">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-[#173d77]">
                Selecciona el tipo de asesoría
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Elige el área en la que necesitas ayuda
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {advisoryTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer overflow-hidden border border-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-30px_rgba(23,61,119,0.4)]",
                    selectedType === type.id
                      ? "border-[#173d77]/30 shadow-[0_14px_40px_-28px_rgba(23,61,119,0.4)]"
                      : "hover:border-[#173d77]/30"
                  )}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <CardContent className="space-y-3 p-5">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", type.bgColor)}>
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
          <div className="space-y-6 py-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-[#173d77] hover:bg-[#173d77]/5 hover:text-[#173d77]">
                <ChevronLeft className="size-4 mr-1" />
                Volver
              </Button>
              {selectedTypeData && (
                <Badge variant="outline" className={cn(selectedTypeData.bgColor, selectedTypeData.color, "border-slate-200") }>
                  {selectedTypeData.title}
                </Badge>
              )}
            </div>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-[#173d77]">
                Selecciona un asesor
              </h3>
              <p className="mt-1 text-sm text-slate-500">
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
                  className="cursor-pointer border border-slate-200 transition-all hover:-translate-y-0.5 hover:border-[#173d77]/30 hover:shadow-[0_18px_50px_-30px_rgba(23,61,119,0.4)]"
                  onClick={() => handleAdvisorSelect("any")}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#173d77]/5">
                      <User className="size-6 text-[#173d77]" />
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
              {getMatchingAdvisors().map((advisor) => {
                const isUnavailable = advisor.is_on_vacation

                return (
                  <Card
                    key={advisor.id}
                    className={cn(
                      "border border-slate-200 transition-all",
                      isUnavailable
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:-translate-y-0.5 hover:border-[#173d77]/30 hover:shadow-[0_18px_50px_-30px_rgba(23,61,119,0.4)]",
                    )}
                    onClick={() => {
                      if (!isUnavailable) handleAdvisorSelect(advisor.id)
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`text-sm font-semibold ${advisor.color}`}>
                          {advisor.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-foreground">{advisor.name}</h4>
                          {advisor.isPartner && (
                            <Badge variant="outline" className="text-xs bg-[#173d77]/5 text-[#173d77] border-[#173d77]/15">
                              Socio
                            </Badge>
                          )}
                          {isUnavailable && (
                            <Badge variant="outline" className="text-xs border-slate-200 bg-slate-100 text-slate-500">
                              No disponible (Vacaciones)
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{advisor.role}</p>
                      </div>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && selectedAdvisor && (
          <div className="space-y-6 py-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setStep(2); setSelectedTime(null); setSelectedDate(null); }} className="text-[#173d77] hover:bg-[#173d77]/5 hover:text-[#173d77]">
                <ChevronLeft className="size-4 mr-1" />
                Volver
              </Button>
              <div className="flex items-center gap-2">
                {selectedTypeData && (
                  <Badge variant="outline" className={cn(selectedTypeData.bgColor, selectedTypeData.color, "text-xs border-slate-200")}>
                    {selectedTypeData.title}
                  </Badge>
                )}
                {selectedAdvisorData && (
                    <Badge variant="outline" className="text-xs bg-[#173d77]/5 text-[#173d77] border-[#173d77]/15">
                    {selectedAdvisorData.name}
                    </Badge>
                )}
              </div>
            </div>

            <div className="text-center">
                        <DialogDescription className="sr-only">Formulario para agendar una cita con Consultoritas</DialogDescription>
              <p className="mt-1 text-sm text-slate-500">
                Elige el momento que mejor te convenga
              </p>
            </div>

            {/* Calendar */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="text-[#173d77] hover:bg-[#173d77]/5"
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
                  className="text-[#173d77] hover:bg-[#173d77]/5"
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
                        "aspect-square rounded-xl text-sm transition-colors",
                        isAvailable
                          ? "cursor-pointer hover:bg-[#173d77]/10"
                          : "cursor-not-allowed text-muted-foreground/40",
                        isSelected && "bg-[#173d77] text-white",
                        isAvailable && !isSelected && "font-medium text-slate-700"
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
                <div className="flex items-center gap-2 text-sm font-medium text-[#173d77]">
                  <CalendarDays className="size-4 text-[#173d77]" />
                  <span className="capitalize">{formatDate(selectedDate)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {getTimeSlotsForDate(selectedDate).map(({ time, advisorId, advisorName }) => (
                    <Button
                      key={`${time}-${advisorId}`}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex h-auto flex-col rounded-xl py-2",
                        selectedTime === time
                            ? "bg-[#173d77] text-white hover:bg-[#204b8f]"
                            : "border-slate-200 text-slate-700 hover:border-[#173d77]/30 hover:bg-[#173d77]/5"
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
                <Card className="border-[#173d77]/15 bg-[#173d77]/5">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-[#173d77]">Resumen de tu cita</h4>
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

                                                <div className="space-y-4 pt-4 border-t border-slate-200">
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
                                                  <Card className="border-slate-200 bg-slate-50">
                                                    <CardContent className="p-4 grid gap-1 text-sm">
                                                      <p className="text-muted-foreground">Cliente</p>
                                                      <p className="font-medium">{prefilledClientName || name || "Cliente"}</p>
                                                      <p className="text-muted-foreground mt-2">Correo</p>
                                                      <p className="font-medium">{prefilledClientEmail || email || "-"}</p>
                                                    </CardContent>
                                                  </Card>
                                                )}
                  <div className="text-sm text-center text-muted-foreground">
                                                  {!hideIdentityFields && <>¿Ya tienes cuenta? <a href="/login" className="text-[#173d77] underline font-medium cursor-pointer">Iniciar sesión</a></>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 border-slate-200 text-[#173d77] hover:bg-[#173d77]/5" onClick={() => { setSelectedTime(null); setSelectedDate(null); }}>
                      Modificar
                    </Button>
                    <Button
                      className="flex-1 bg-[#173d77] text-white hover:bg-[#204b8f] shadow-[0_16px_36px_-18px_rgba(23,61,119,0.45)]"
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
                                scheduled_at: formatLocalIsoWithOffset(scheduled),
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
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
