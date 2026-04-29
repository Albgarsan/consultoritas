"use client"

import { CheckCircle2, Clock, PenLine } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type TaxStatus = "en-proceso" | "pendiente-firma" | "presentado"

interface TaxItem {
  name: string
  period: string
  status: TaxStatus
  dueDate: string
}

const taxItems: TaxItem[] = [
  {
    name: "Modelo 303 - IVA",
    period: "1T 2026",
    status: "pendiente-firma",
    dueDate: "20 Abr 2026",
  },
  {
    name: "Modelo 130 - IRPF",
    period: "1T 2026",
    status: "en-proceso",
    dueDate: "20 Abr 2026",
  },
  {
    name: "Modelo 303 - IVA",
    period: "4T 2025",
    status: "presentado",
    dueDate: "30 Ene 2026",
  },
  {
    name: "Modelo 390 - Resumen IVA",
    period: "2025",
    status: "presentado",
    dueDate: "30 Ene 2026",
  },
]

const statusConfig: Record<TaxStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  "en-proceso": {
    label: "En proceso",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  "pendiente-firma": {
    label: "Pendiente de firma",
    icon: PenLine,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "presentado": {
    label: "Presentado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
}

export function TaxStatus() {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Estado de Impuestos</CardTitle>
        <CardDescription>Seguimiento de tus obligaciones fiscales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {taxItems.map((item, index) => {
            const config = statusConfig[item.status]
            const StatusIcon = config.icon
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.period} &middot; Vence: {item.dueDate}
                  </span>
                </div>
                <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
                  <StatusIcon className="size-3" />
                  {config.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
