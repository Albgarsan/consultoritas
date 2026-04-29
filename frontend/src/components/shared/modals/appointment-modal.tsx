"use client"

import { useState } from "react"
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
  X,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ConsultoritasLogo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"

interface AppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

// All advisors with their specialties
const allAdvisors = [
  {
    id: "antonio-garcia",
    name: "Antonio García",
    role: "Socio Principal - Experto Legal",
    initials: "AG",
    color: "bg-primary/20 text-primary",
    isPartner: true,
    specialties: ["judicial", "contable", "general"],
  },
  {
    id: "carmen-ruiz",
    name: "Carmen Ruiz",
    role: "Socia Principal - Especialista Fiscal",
    initials: "CR",
    color: "bg-accent/20 text-accent",
    isPartner: true,
    specialties: ["fiscal", "general"],
  },
  {
    id: "miguel-fernandez",
    name: "Miguel Fernández",
    role: "Asesor Laboral Senior",
    initials: "MF",
    color: "bg-emerald-100 text-emerald-700",
    isPartner: false,
    specialties: ["laboral"],
  },
  {
    id: "laura-martin",
    name: "Laura Martín",
    role: "Asesora Contable",
    initials: "LM",
    color: "bg-amber-100 text-amber-700",
    isPartner: false,
    specialties: ["contable"],
  },
]

// Simulated available time slots by advisor
const advisorSlots: Record<string, { date: Date; times: string[] }[]> = {
  "antonio-garcia": [
    { date: new Date(2026, 2, 18), times: ["09:00", "10:30", "12:00"] },
    { date: new Date(2026, 2, 19), times: ["09:30", "11:00"] },
    { date: new Date(2026, 2, 20), times: ["09:00", "10:00", "11:00", "12:00"] },
    { date: new Date(2026, 2, 23), times: ["09:00", "10:30", "12:00"] },
    { date: new Date(2026, 2, 24), times: ["09:30", "11:00", "12:30"] },
  ],
  "carmen-ruiz": [
    { date: new Date(2026, 2, 18), times: ["10:00", "11:30"] },
    { date: new Date(2026, 2, 19), times: ["09:00", "10:00", "11:00"] },
    { date: new Date(2026, 2, 20), times: ["09:30", "12:00"] },
    { date: new Date(2026, 2, 23), times: ["09:00", "10:00", "11:30"] },
    { date: new Date(2026, 2, 25), times: ["09:00", "10:30", "12:00"] },
  ],
  "miguel-fernandez": [
    { date: new Date(2026, 2, 18), times: ["09:00", "12:00"] },
    { date: new Date(2026, 2, 19), times: ["10:30", "11:30"] },
    { date: new Date(2026, 2, 23), times: ["09:30", "11:00", "12:30"] },
    { date: new Date(2026, 2, 24), times: ["09:00", "10:00", "11:00"] },
  ],
  "laura-martin": [
    { date: new Date(2026, 2, 18), times: ["09:30", "11:00", "12:30"] },
    { date: new Date(2026, 2, 19), times: ["09:00", "10:30"] },
    { date: new Date(2026, 2, 20), times: ["10:00", "11:00", "12:00"] },
    { date: new Date(2026, 2, 24), times: ["09:30", "11:00"] },
  ],
}

export function AppointmentModal({ open, onOpenChange }: AppointmentModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1))

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

    // For general/none, show only partners
    if (selectedType === "general") {
      return allAdvisors.filter(a => a.isPartner)
    }

    // For specific areas, show advisors of that area + "Any" option
    return allAdvisors.filter(a => a.specialties.includes(selectedType))
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

    if (selectedAdvisor === "any") {
      // Combine all dates from available advisors for this specialty
      const availableAdvisors = getAvailableAdvisors()
      const allDates: Date[] = []
      availableAdvisors.forEach(advisor => {
        const slots = advisorSlots[advisor.id] || []
        slots.forEach(slot => {
          if (!allDates.some(d => d.getTime() === slot.date.getTime())) {
            allDates.push(slot.date)
          }
        })
      })
      return allDates
    }

    const slots = advisorSlots[selectedAdvisor] || []
    return slots.map(s => s.date)
  }

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: Date) => {
    if (!selectedAdvisor) return []

    if (selectedAdvisor === "any") {
      const availableAdvisors = getAvailableAdvisors()
      const slots: { time: string; advisorId: string; advisorName: string }[] = []
      availableAdvisors.forEach(advisor => {
        const advisorSlotData = advisorSlots[advisor.id] || []
        const daySlot = advisorSlotData.find(s => s.date.getTime() === date.getTime())
        if (daySlot) {
          daySlot.times.forEach(time => {
            slots.push({ time, advisorId: advisor.id, advisorName: advisor.name })
          })
        }
      })
      return slots.sort((a, b) => a.time.localeCompare(b.time))
    }

    const slots = advisorSlots[selectedAdvisor] || []
    const daySlot = slots.find(s => s.date.getTime() === date.getTime())
    if (!daySlot) return []

    const advisor = allAdvisors.find(a => a.id === selectedAdvisor)
    return daySlot.times.map(time => ({
      time,
      advisorId: selectedAdvisor,
      advisorName: advisor?.name || ""
    }))
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
  const selectedAdvisorData = allAdvisors.find(a => a.id === selectedAdvisor)

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
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
                          {allAdvisors.find(a => a.id === selectedAdvisor)?.name || selectedAdvisorData?.name}
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

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setSelectedTime(null); setSelectedDate(null); }}>
                    Modificar
                  </Button>
                  <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={resetAndClose}>
                    Confirmar Cita
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
