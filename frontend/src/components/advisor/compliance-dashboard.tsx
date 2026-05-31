"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Filter, Loader2, TriangleAlert, History } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useApiData } from "@/lib/use-api"
import ComplianceHistory from "@/components/advisor/compliance-history"
import { mutate as globalMutate } from "swr"

type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4"

type TaxCalendarEntry = {
  id: string
  business: {
    id: string
    name: string
    responsible_advisor_id?: string | null
    responsible_advisor_name?: string | null
  };
  tax_type: string
  period: string
  period_start: string
  period_end: string
  deadline: string
  is_presented: boolean
  presented_date?: string
  presented_by?: { id: string; first_name?: string; last_name?: string; email?: string }
  presented_by_name?: string | null
}

type MatrixCell = {
  entry?: TaxCalendarEntry
  state: "presented" | "pending" | "late" | "missing"
}

type MatrixRow = {
  businessId: string
  businessName: string
  responsibleAdvisorId?: string | null
  responsibleAdvisorName?: string | null
  business?: TaxCalendarEntry["business"]
  cells: Record<string, MatrixCell>
  urgentCount: number
}

type AdvisorOption = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

const MODELS = ["111", "115", "123", "130", "202", "303"]

function parseLocalDateYYYYMMDD(dateStr?: string | null): Date {
  if (!dateStr || typeof dateStr !== "string") return new Date(NaN)
  const parts = dateStr.split("-").map(Number)
  if (parts.length < 3) return new Date(NaN)
  const [year, month, day] = parts
  return new Date(year, (month || 1) - 1, day || 1)
}

function quarterFromDate(d: Date): QuarterKey {
  const month = d.getMonth() + 1
  if (month <= 3) return "Q1"
  if (month <= 6) return "Q2"
  if (month <= 9) return "Q3"
  return "Q4"
}

function filingQuarterForToday(today: Date): { quarter: QuarterKey; year: number; windowOpen: boolean } {
  const month = today.getMonth() + 1
  const day = today.getDate()
  const inWindowMonth = month === 1 || month === 4 || month === 7 || month === 10

  if (inWindowMonth) {
    if (month === 1) {
      return {
        quarter: "Q4",
        year: today.getFullYear() - 1,
        windowOpen: day <= 20,
      }
    }
    if (month === 4) {
      return {
        quarter: "Q1",
        year: today.getFullYear(),
        windowOpen: day <= 20,
      }
    }
    if (month === 7) {
      return {
        quarter: "Q2",
        year: today.getFullYear(),
        windowOpen: day <= 20,
      }
    }
    return {
      quarter: "Q3",
      year: today.getFullYear(),
      windowOpen: day <= 20,
    }
  }

  return { quarter: quarterFromDate(today), year: today.getFullYear(), windowOpen: false }
}

function toModelCode(taxType: string): string {
  const s = String(taxType || "").trim().toUpperCase()
  const direct = s.match(/\b(111|115|123|130|202|303)\b/)
  if (direct) return direct[1]

  // Common legacy name mappings
  if (s.includes("IVA")) return "303"
  if (s.includes("IRPF") || s.includes("PAGO A CUENTA") || s.includes("PAGO_A_CUENTA")) return "130"
  if (s.includes("RETENC") || s.includes("RET.") || s.includes("RETEN")) {
    if (s.includes("115") || s.includes("ARREND")) return "115"
    if (s.includes("123") || s.includes("PROF")) return "123"
    return "111"
  }

  return s
}

function isOverdue(deadline: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = parseLocalDateYYYYMMDD(deadline)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export function ComplianceDashboard() {
  const [search, setSearch] = useState("")
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const now = new Date()
  const filing = filingQuarterForToday(now)
  const effectiveWindowOpen = filing.windowOpen

  const {
    data: calendarEntries = [],
    mutate: mutateTaxCalendar,
    isLoading,
  } = useApiData<TaxCalendarEntry[]>(`/api/documents/tax-calendar/?year=${filing.year}`, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
  const { data: advisors = [] } = useApiData<AdvisorOption[]>("/api/users/advisors/", {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  const { data: currentUser } = useApiData<{ id: string; role?: string }>("/api/users/me/")

  useEffect(() => {
    const refresh = () => {
      void mutateTaxCalendar()
    }
    window.addEventListener("consultoritas:refresh", refresh)
    return () => window.removeEventListener("consultoritas:refresh", refresh)
  }, [mutateTaxCalendar])

  const filtered = useMemo(() => {
    const qLabel = filing.quarter
    return calendarEntries.filter((entry) => {
      const model = toModelCode(entry.tax_type)
      if (!MODELS.includes(model)) return false

      const periodDate = parseLocalDateYYYYMMDD(entry.period_start)
      const periodQuarter = quarterFromDate(periodDate)
      const periodYear = periodDate.getFullYear()
      if (periodQuarter !== qLabel || periodYear !== filing.year) return false

      return entry.business?.name?.toLowerCase().includes(search.toLowerCase())
    })
  }, [calendarEntries, filing.quarter, filing.year, search])

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const byBusiness = new Map<string, MatrixRow>()

    for (const entry of filtered) {
      if (!byBusiness.has(entry.business.id)) {
        byBusiness.set(entry.business.id, {
          businessId: entry.business.id,
          businessName: entry.business.name,
          responsibleAdvisorId: entry.business.responsible_advisor_id || null,
          responsibleAdvisorName: entry.business.responsible_advisor_name || null,
          business: entry.business,
          urgentCount: 0,
          cells: Object.fromEntries(
            MODELS.map((model) => [model, { state: "missing" as const }]),
          ) as Record<string, MatrixCell>,
        })
      }

      const row = byBusiness.get(entry.business.id)!
      const model = toModelCode(entry.tax_type)
      const late = !entry.is_presented && isOverdue(entry.deadline)
      const pending = !entry.is_presented && !late

      if (late) row.urgentCount += 1

      row.cells[model] = {
        entry,
        state: entry.is_presented ? "presented" : late ? "late" : pending ? "pending" : "missing",
      }
    }

    return Array.from(byBusiness.values()).sort((a, b) => {
      if (a.urgentCount !== b.urgentCount) return b.urgentCount - a.urgentCount
      return a.businessName.localeCompare(b.businessName)
    })
  }, [filtered])

  const filteredMatrixRows = useMemo(() => {
    if (selectedAdvisor === "all") return matrixRows
    return matrixRows.filter(
      (row) =>
        row.responsibleAdvisorId === selectedAdvisor ||
        row.business?.responsible_advisor_id === selectedAdvisor,
    )
  }, [matrixRows, selectedAdvisor])

  const advisorOptions = useMemo(() => {
    return advisors.map((advisor) => ({
      id: advisor.id,
      label:
        [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() ||
        advisor.email ||
        "Asesor",
    }))
  }, [advisors])

  const totalUrgent = useMemo(
    () => filteredMatrixRows.reduce((acc, row) => acc + row.urgentCount, 0),
    [filteredMatrixRows],
  )

  const handleMarkPresented = async (entryId: string) => {
    setActionLoadingId(entryId)
    try {
      const res = await apiFetch(`/api/documents/tax-calendar/${entryId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_presented: true,
        }),
      })

      if (!res.ok) {
        throw new Error("Error actualizando entrada")
      }

      await mutateTaxCalendar()
      await globalMutate("/api/business/companies/")
      window.dispatchEvent(new Event("consultoritas:refresh"))
      toast.success("Modelo presentado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    } finally {
      setActionLoadingId(null)
    }
  }

  const renderCell = (cell: MatrixCell, row: MatrixRow) => {
    if (cell.state === "missing" || !cell.entry) {
      return <div className="flex items-center justify-center text-xs text-slate-400">-</div>
    }

    const entry = cell.entry
    const canMarkPresented = currentUser?.role === "Asesor" && currentUser.id === row.responsibleAdvisorId
    const presentedDate = entry.presented_date ? new Date(entry.presented_date) : null
    const presenterName =
      entry.presented_by_name ||
      [entry.presented_by?.first_name, entry.presented_by?.last_name].filter(Boolean).join(" ") ||
      entry.presented_by?.email ||
      null
    const presentedLabel = presentedDate && !Number.isNaN(presentedDate.getTime())
      ? presentedDate.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null

    if (!effectiveWindowOpen && cell.state === "pending") {
      return (
        <Badge variant="outline" className="text-[11px] border-slate-200 text-slate-500 bg-slate-100">
          Cerrado
        </Badge>
      )
    }

    if (cell.state === "presented") {
      return (
        <div className="flex flex-col items-center gap-1 text-center">
          <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-700 bg-emerald-50 gap-1">
            <CheckCircle2 className="size-3" /> Presentado
          </Badge>
          {presentedLabel && (
            <p className="max-w-[170px] text-[11px] text-slate-500">
              Presentado el {presentedLabel}{presenterName ? ` por ${presenterName}` : ""}
            </p>
          )}
        </div>
      )
    }

    if (cell.state === "late") {
      return (
        <Badge variant="outline" className="text-[11px] border-rose-300 text-rose-700 bg-rose-50 gap-1">
          <TriangleAlert className="size-3" /> Vencido
        </Badge>
      )
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <Badge variant="outline" className="text-[11px] border-amber-300 text-amber-700 bg-amber-50 gap-1">
          <Clock3 className="size-3" /> Pendiente
        </Badge>
        {canMarkPresented ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={() => handleMarkPresented(entry.id)}
            disabled={actionLoadingId === entry.id}
          >
            {actionLoadingId === entry.id ? <Loader2 className="size-3 animate-spin" /> : "Presentar"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            disabled
            title="Solo el asesor responsable puede marcarlo como presentado"
          >
            Reservado
          </Button>
        )}
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Histórico</h2>
          <div>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Volver a Matriz
            </Button>
          </div>
        </div>
        <ComplianceHistory />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Matriz de Cumplimiento Trimestral</h2>
        <div className="flex items-center gap-4">
          <p className="text-muted-foreground mt-1">
            Periodo activo: {filing.quarter} {filing.year}. Ventana AEAT {effectiveWindowOpen ? "abierta (1-20)" : "cerrada"}.
          </p>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => setShowHistory((s) => !s)}>
                <History className="mr-2 size-4" /> Consultar histórico de clientes
                </Button>
            </div>
            </div>
        </div>

        <Card className="border-border/50 shadow-sm">
            <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <Filter className="size-4" /> Filtro de clientes
            </CardTitle>
            <CardDescription>Control trimestral por cliente, modelo oficial y asesor responsable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." />
            <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
              <SelectTrigger className="md:w-72">
                <SelectValue placeholder="Todos los asesores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los asesores</SelectItem>
                {advisorOptions.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Incidencias urgentes: <span className="font-semibold text-rose-600">{totalUrgent}</span>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Clientes vs Modelos ({filing.quarter})</CardTitle>
          <CardDescription>
            {effectiveWindowOpen
              ? "Puedes marcar directamente modelos pendientes durante la ventana 1-20."
              : "Fuera de ventana, los pendientes aparecen en gris para seguimiento."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredMatrixRows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No hay datos para los filtros seleccionados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 text-left font-semibold">Cliente</th>
                    {MODELS.map((model) => (
                      <th key={model} className="p-3 text-center font-semibold">{model}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrixRows.map((row) => (
                    <tr key={row.businessId} className={cn("border-b", row.urgentCount > 0 && "bg-rose-50/20")}>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="space-y-0.5">
                            <span className="font-medium">{row.businessName}</span>
                            <p className="text-xs text-muted-foreground">
                              Asesor responsable: {row.responsibleAdvisorName || "Sin asignar"}
                            </p>
                          </div>
                          {row.urgentCount > 0 && (
                            <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[11px]">
                              {row.urgentCount} urgentes
                            </Badge>
                          )}
                        </div>
                      </td>
                      {MODELS.map((model) => (
                        <td key={`${row.businessId}-${model}`} className="p-3 text-center align-middle">
                          {renderCell(row.cells[model], row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
