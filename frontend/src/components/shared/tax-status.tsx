"use client"

import { CheckCircle2, Clock, PenLine } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { DocumentoFacturacion, TaxCalendarEntry } from "@/lib/api"

type TaxStatus = "vencido" | "pendiente-firma" | "presentado"

interface TaxItem {
  name: string
  period: string
  status: TaxStatus
  dueDate: string
}

const mockTaxItems: TaxItem[] = [
  {
    name: "Modelo 303 - IVA",
    period: "1T 2026",
    status: "pendiente-firma",
    dueDate: "20 Abr 2026",
  },
  {
    name: "Modelo 130 - IRPF",
    period: "1T 2026",
    status: "vencido",
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
  "vencido": {
    label: "Vencido",
    icon: Clock,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  "pendiente-firma": {
    label: "Pendiente de firma",
    icon: PenLine,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  presentado: {
    label: "Presentado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
}

function parseLocalDateYYYYMMDD(dateStr: string): Date {
  // Parse "YYYY-MM-DD" as local date, not UTC
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const taxLabelMap: Record<string, string> = {
  IVA: "Modelo 303 - IVA",
  IRPF: "Modelo 130 - IRPF",
  "Impuesto de Sociedades": "Modelo 200/202 - Impuesto de Sociedades",
  Retenciones: "Modelo 111 - Retenciones",
  "Pagos a Cuenta": "Modelo 115 - Pagos a Cuenta",
  Aduanas: "Aduanas",
}

function getTaxStatus(entry: TaxCalendarEntry): TaxStatus {
  if (entry.is_presented) return "presentado"
  const deadline = parseLocalDateYYYYMMDD(entry.deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return deadline < today ? "vencido" : "pendiente-firma"
}

function formatItem(entry: TaxCalendarEntry) {
  return taxLabelMap[entry.tax_type] || entry.tax_type
}

interface TaxStatusProps {
  documents?: DocumentoFacturacion[]
  calendarEntries?: TaxCalendarEntry[]
  useRealCalendar?: boolean
}

export function TaxStatus({ documents = [], calendarEntries = [], useRealCalendar = false }: TaxStatusProps) {
  if (useRealCalendar) {
    if (calendarEntries.length === 0) {
      return (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Estado de Impuestos</CardTitle>
            <CardDescription>No hay obligaciones fiscales sincronizadas.</CardDescription>
          </CardHeader>
        </Card>
      )
    }

    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Estado de Impuestos</CardTitle>
          <CardDescription>Seguimiento real de tus obligaciones fiscales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {calendarEntries.map((entry, index) => {
              const status = getTaxStatus(entry)
              const config = statusConfig[status]
              const StatusIcon = config.icon

              return (
                <div
                  key={entry.id || index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm text-foreground">{formatItem(entry)}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.period} &middot; Vence: {parseLocalDateYYYYMMDD(entry.deadline).toLocaleDateString("es-ES")}
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

  if (documents.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Estado de Impuestos</CardTitle>
          <CardDescription>No hay obligaciones fiscales sincronizadas.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const documentBasedItems: TaxItem[] = documents.slice(0, 4).map((doc) => {
    const uploadedDate = doc.uploaded_at ? new Date(doc.uploaded_at) : new Date()
    const dueDate = uploadedDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    const period = `${Math.floor(uploadedDate.getMonth() / 3) + 1}T ${uploadedDate.getFullYear()}`
    const normalizedStatus = (doc.status || "").toLowerCase()
    const status: TaxStatus = normalizedStatus === "procesado" ? "presentado" : "pendiente-firma"

    return {
      name: `${doc.doc_type || "Documento"} - ${doc.file_name || "Sin nombre"}`,
      period,
      status,
      dueDate,
    }
  })

  const itemsToRender = documentBasedItems.length > 0 ? documentBasedItems : mockTaxItems

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Estado de Impuestos</CardTitle>
        <CardDescription>Seguimiento de tus obligaciones fiscales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {itemsToRender.map((item, index) => {
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
