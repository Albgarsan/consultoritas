"use client"

import { useMemo, useState } from "react"
import { FiscalHealthCards } from "../shared/stat-cards"
import { IncomeExpenseChart } from "../shared/chart/revenue"
import { IVAComparisonChart } from "../shared/chart/tax-comparison"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type DocumentoFacturacion, type TaxCalendarEntry } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, Calendar, CheckCircle2, Clock3, TriangleAlert } from "lucide-react"

interface DashboardViewProps {
  onNavigate: (view: string) => void
  user?: { first_name?: string; email?: string } | null
  documents?: DocumentoFacturacion[]
  stats?: unknown
  calendarEntries?: TaxCalendarEntry[]
  isLoading?: boolean
}

type Period = "trimestre" | "semestre" | "anual"
type Quarter = "Q1" | "Q2" | "Q3" | "Q4"
type CellStatus = "presented" | "pending" | "late" | "none"

const MODELS = ["111", "115", "123", "130", "202", "303"]
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"]

function parseLocalDateYYYYMMDD(dateStr?: string | null): Date {
  if (!dateStr || typeof dateStr !== "string") return new Date(NaN)
  const parts = dateStr.split("-").map(Number)
  if (parts.length < 3) return new Date(NaN)
  const [year, month, day] = parts
  return new Date(year, (month || 1) - 1, day || 1)
}

function quarterFromDate(d: Date): Quarter {
  const month = d.getMonth() + 1
  if (month <= 3) return "Q1"
  if (month <= 6) return "Q2"
  if (month <= 9) return "Q3"
  return "Q4"
}

function toModelCode(taxType?: string) {
  const s = String(taxType || "").trim().toUpperCase()
  const direct = s.match(/\b(111|115|123|130|202|303)\b/)
  if (direct) return direct[1]

  if (s.includes("IVA")) return "303"
  if (s.includes("IRPF") || s.includes("PAGO A CUENTA") || s.includes("PAGO_A_CUENTA")) return "130"
  if (s.includes("RETENC") || s.includes("RET.") || s.includes("RETEN")) {
    if (s.includes("115") || s.includes("ARREND")) return "115"
    if (s.includes("123") || s.includes("PROF")) return "123"
    return "111"
  }

  return s
}

function isLate(deadline?: string) {
  if (!deadline) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = parseLocalDateYYYYMMDD(deadline)
  due.setHours(0, 0, 0, 0)
  return due < now
}

export function DashboardView({ onNavigate, user, documents = [], stats, calendarEntries = [], isLoading = false }: DashboardViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("trimestre")

  const currentYear = new Date().getFullYear()

  const availableModels = useMemo(() => {
    const modelSet = new Set<string>()
    for (const entry of calendarEntries) {
      const d = parseLocalDateYYYYMMDD(entry.period_start)
      if (d.getFullYear() !== currentYear) continue
      const model = toModelCode(entry.tax_type)
      if (MODELS.includes(model)) modelSet.add(model)
    }

    return MODELS.filter((model) => modelSet.has(model))
  }, [calendarEntries, currentYear])

  const matrix = useMemo(() => {
    const result: Record<string, Record<Quarter, CellStatus>> = Object.fromEntries(
      MODELS.map((model) => [
        model,
        { Q1: "none", Q2: "none", Q3: "none", Q4: "none" } as Record<Quarter, CellStatus>,
      ]),
    )

    for (const entry of calendarEntries) {
      const model = toModelCode(entry.tax_type)
      if (!MODELS.includes(model)) continue

      const d = parseLocalDateYYYYMMDD(entry.period_start)
      if (d.getFullYear() !== currentYear) continue

      const q = quarterFromDate(d)
      if (entry.is_presented) {
        result[model][q] = "presented"
      } else {
        result[model][q] = isLate(entry.deadline) ? "late" : "pending"
      }
    }

    return result
  }, [calendarEntries, currentYear])

  const validatedDocuments = documents.filter(
    (doc) => (doc.status || "").toLowerCase() === "procesado"
  )

  const pendingDocs = documents.length - validatedDocuments.length

  const renderStatus = (status: CellStatus) => {
    if (status === "presented") return <CheckCircle2 className="size-4 text-emerald-600" aria-label="Presentado" />
    if (status === "pending") return <Clock3 className="size-4 text-amber-600" aria-label="Pendiente" />
    if (status === "late") return <TriangleAlert className="size-4 text-rose-600" aria-label="Vencido" />
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Bienvenida de nuevo, {user?.first_name || "Cliente"}
          </h2>
          <p className="text-muted-foreground">
            Sigue tu control fiscal trimestral en una sola vista.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(value: string) => setSelectedPeriod(value as Period)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="size-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Seleccionar periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trimestre">Último Trimestre</SelectItem>
              <SelectItem value="semestre">Último Semestre</SelectItem>
              <SelectItem value="anual">Último Año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => onNavigate("facturacion")} className="gap-2">
            <Upload className="size-4" />
            Subir Factura
          </Button>
        </div>
      </div>

      <FiscalHealthCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeExpenseChart period={selectedPeriod} stats={stats} isLoading={isLoading} />
        <IVAComparisonChart period={selectedPeriod} stats={stats} isLoading={isLoading} />
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Seguimiento Fiscal por Modelo</CardTitle>
          <CardDescription>
            Iconos: ⏳ pendiente, ✅ presentado, ⚠️ vencido. Documentos procesados: {validatedDocuments.length}. Pendientes de validar: {pendingDocs}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-[160px] p-3 text-left font-semibold">Modelo</th>
                  {QUARTERS.map((q) => (
                    <th key={q} className="w-[150px] p-3 text-center font-semibold">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {availableModels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No hay modelos asignados para este cliente.
                    </td>
                  </tr>
                ) : (
                  availableModels.map((model) => (
                    <tr key={model} className="border-b">
                      <td className="p-3 font-medium">Modelo {model}</td>
                      {QUARTERS.map((quarter) => (
                        <td key={`${model}-${quarter}`} className="p-3 text-center">
                          <div className="flex items-center justify-center">{renderStatus(matrix[model][quarter])}</div>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
