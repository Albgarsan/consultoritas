"use client"

import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ModelStatus = "presentado" | "en-proceso" | "pendiente"

interface TaxModel {
  model: string
  name: string
  period: string
  dueDate: string
  status: ModelStatus
}

const taxModels: TaxModel[] = [
  // 1T 2026
  {
    model: "303",
    name: "IVA Trimestral",
    period: "1T 2026",
    dueDate: "20 Abr 2026",
    status: "en-proceso",
  },
  {
    model: "111",
    name: "Retenciones IRPF",
    period: "1T 2026",
    dueDate: "20 Abr 2026",
    status: "pendiente",
  },
  {
    model: "130",
    name: "Pago Fraccionado IRPF",
    period: "1T 2026",
    dueDate: "20 Abr 2026",
    status: "pendiente",
  },
  // 4T 2025
  {
    model: "303",
    name: "IVA Trimestral",
    period: "4T 2025",
    dueDate: "30 Ene 2026",
    status: "presentado",
  },
  {
    model: "111",
    name: "Retenciones IRPF",
    period: "4T 2025",
    dueDate: "20 Ene 2026",
    status: "presentado",
  },
  {
    model: "190",
    name: "Resumen Retenciones",
    period: "2025",
    dueDate: "31 Ene 2026",
    status: "presentado",
  },
  {
    model: "390",
    name: "Resumen Anual IVA",
    period: "2025",
    dueDate: "30 Ene 2026",
    status: "presentado",
  },
]

const statusConfig: Record<ModelStatus, { label: string; icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  "presentado": {
    label: "Presentado",
    icon: CheckCircle2,
    className: "text-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "en-proceso": {
    label: "En proceso",
    icon: Clock,
    className: "text-amber-600",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "pendiente": {
    label: "Pendiente",
    icon: AlertCircle,
    className: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
}

export function AccountingCalendar() {
  // Group by period
  const groupedModels = taxModels.reduce((acc, model) => {
    if (!acc[model.period]) {
      acc[model.period] = []
    }
    acc[model.period].push(model)
    return acc
  }, {} as Record<string, TaxModel[]>)

  const periods = Object.keys(groupedModels)

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Calendario Contable</CardTitle>
        <CardDescription>Estado de tus modelos fiscales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {periods.map((period) => (
          <div key={period}>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                {period}
              </span>
            </h4>
            <div className="space-y-2">
              {groupedModels[period].map((model, idx) => {
                const config = statusConfig[model.status]
                const StatusIcon = config.icon
                return (
                  <div
                    key={`${model.model}-${idx}`}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      model.status === "presentado"
                        ? "bg-emerald-50/50 border-emerald-200"
                        : model.status === "en-proceso"
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-muted/30 border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm",
                        model.status === "presentado"
                          ? "bg-emerald-100 text-emerald-700"
                          : model.status === "en-proceso"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {model.model}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{model.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Vencimiento: {model.dueDate}
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
