"use client"

import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaxCalendarEntry } from "@/lib/api"

type ModelStatus = "presentado" | "vencido" | "pendiente"

const statusConfig: Record<ModelStatus, { label: string; icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  presentado: {
    label: "Presentado",
    icon: CheckCircle2,
    className: "text-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  vencido: {
    label: "Vencido",
    icon: Clock,
    className: "text-red-600",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
  pendiente: {
    label: "Pendiente",
    icon: AlertCircle,
    className: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
}

const taxLabelMap: Record<string, { model: string; name: string }> = {
  IVA: { model: "303", name: "IVA Trimestral" },
  IRPF: { model: "130", name: "Pago Fraccionado IRPF" },
  "Impuesto de Sociedades": { model: "200/202", name: "Impuesto de Sociedades" },
  Retenciones: { model: "111", name: "Retenciones IRPF" },
  "Pagos a Cuenta": { model: "115", name: "Pagos a Cuenta" },
  Aduanas: { model: "Aduanas", name: "Aduanas" },
}

function getCalendarStatus(entry: TaxCalendarEntry): ModelStatus {
  if (entry.is_presented) return "presentado"
  const deadline = new Date(entry.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return deadline < today ? "vencido" : "pendiente"
}

function getCalendarModel(entry: TaxCalendarEntry) {
  return taxLabelMap[entry.tax_type] || { model: entry.tax_type, name: entry.tax_type }
}

interface AccountingCalendarProps {
  calendarEntries?: TaxCalendarEntry[]
  useRealCalendar?: boolean
}

export function AccountingCalendar({ calendarEntries = [], useRealCalendar = false }: AccountingCalendarProps) {
  if (!useRealCalendar) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Calendario Contable</CardTitle>
          <CardDescription>Activa el calendario real para mostrar obligaciones fiscales sincronizadas.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (calendarEntries.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Calendario Contable</CardTitle>
          <CardDescription>No hay obligaciones generadas todavía.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sortedEntries = [...calendarEntries].sort(
    (left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime()
  )

  const groupedEntries = sortedEntries.reduce((acc, entry) => {
    const deadline = new Date(entry.deadline)
    const periodLabel = entry.period === "Anual" ? `${deadline.getFullYear()}` : `${Math.floor(new Date(entry.period_start).getMonth() / 3) + 1}T ${new Date(entry.period_start).getFullYear()}`

    if (!acc[periodLabel]) {
      acc[periodLabel] = []
    }
    acc[periodLabel].push(entry)
    return acc
  }, {} as Record<string, TaxCalendarEntry[]>)

  const sortedPeriodKeys = Object.keys(groupedEntries).sort((a, b) => {
    const entriesA = [...groupedEntries[a]].sort(
      (left, right) => new Date(left.period_start).getTime() - new Date(right.period_start).getTime()
    )
    const entriesB = [...groupedEntries[b]].sort(
      (left, right) => new Date(left.period_start).getTime() - new Date(right.period_start).getTime()
    )
    if (!entriesA[0] || !entriesB[0]) return 0
    const dateA = new Date(entriesA[0].period_start).getTime()
    const dateB = new Date(entriesB[0].period_start).getTime()
    return dateA - dateB
  })

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Calendario Contable</CardTitle>
        <CardDescription>Obligaciones generadas automáticamente desde el calendario fiscal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedPeriodKeys
          .map((period) => (
            <div key={period}>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">{period}</span>
              </h4>
              <div className="space-y-2">
                {groupedEntries[period].map((entry) => {
                  const status = getCalendarStatus(entry)
                  const config = statusConfig[status]
                  const StatusIcon = config.icon
                  const model = getCalendarModel(entry)

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                        entry.is_presented
                          ? "bg-emerald-50/50 border-emerald-200"
                          : status === "vencido"
                            ? "bg-red-50/50 border-red-200"
                            : "bg-muted/30 border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm",
                            entry.is_presented
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "vencido"
                                ? "bg-red-100 text-red-700"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {model.model}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{model.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Vencimiento: {new Date(entry.deadline).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("size-4", config.className)} />
                        <Badge variant="outline" className={cn("text-xs", config.badgeClass)}>
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
