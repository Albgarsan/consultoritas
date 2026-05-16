"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Filter, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useApiData } from "@/lib/use-api"
import { mutate as globalMutate } from "swr"

type TaxCalendarEntry = {
  id: string
  business: { id: string; name: string }
  tax_type: string
  period: string
  period_start: string
  period_end: string
  deadline: string
  is_presented: boolean
  presented_date?: string
  notes: string
}

type GroupedBusiness = {
  businessId: string
  businessName: string
  hasOverdue: boolean
  entries: TaxCalendarEntry[]
}

export function ComplianceDashboard() {
  const [search, setSearch] = useState("")
  const [modelFilter, setModelFilter] = useState("all")
  const [quarterFilter, setQuarterFilter] = useState("all")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  // Consumo reactivo del calendario fiscal mediante SWR
  const {
    data: calendarEntries = [],
    mutate: mutateTaxCalendar,
    isLoading
  } = useApiData<TaxCalendarEntry[]>(`/api/documents/tax-calendar/?year=${currentYear}`, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  // Sincronización global cruzada: si otra pantalla muta datos, este dashboard invalida su caché
  useEffect(() => {
    const refresh = () => {
      void mutateTaxCalendar()
    }
    window.addEventListener("consultoritas:refresh", refresh)
    return () => window.removeEventListener("consultoritas:refresh", refresh)
  }, [mutateTaxCalendar])

  const toModelCode = (entry: TaxCalendarEntry) => {
    const taxType = entry.tax_type.toLowerCase()
    if (taxType.includes("iva")) return "303"
    if (taxType.includes("irpf")) return "130"
    if (taxType.includes("sociedades")) return "200"
    if (taxType.includes("retenciones")) return "111"
    if (taxType.includes("pagos a cuenta")) return "202"
    return "OTRO"
  }

  const toQuarter = (entry: TaxCalendarEntry) => {
    const month = new Date(entry.period_start).getMonth() + 1
    if (month <= 3) return "Q1"
    if (month <= 6) return "Q2"
    if (month <= 9) return "Q3"
    return "Q4"
  }

  const isOverdue = (deadline: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(deadline)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const daysUntil = (deadline: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(deadline)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const modelOptions = useMemo(() => {
    const set = new Set(calendarEntries.map(toModelCode))
    return Array.from(set).sort()
  }, [calendarEntries])

  const grouped = useMemo(() => {
    const filtered = [...calendarEntries]
      .sort((left, right) => new Date(left.deadline).getTime() - new Date(right.deadline).getTime())
      .filter((entry) => {
        const clientMatch = entry.business?.name?.toLowerCase().includes(search.toLowerCase())
        if (!clientMatch) return false
        if (modelFilter !== "all" && toModelCode(entry) !== modelFilter) return false
        if (quarterFilter !== "all" && toQuarter(entry) !== quarterFilter) return false
        return true
      })

    const map = new Map<string, GroupedBusiness>()
    for (const entry of filtered) {
      const key = entry.business.id
      if (!map.has(key)) {
        map.set(key, {
          businessId: key,
          businessName: entry.business.name,
          hasOverdue: false,
          entries: [],
        })
      }
      const row = map.get(key)!
      row.entries.push(entry)
      if (!entry.is_presented && isOverdue(entry.deadline)) {
        row.hasOverdue = true
      }
    }

    for (const g of map.values()) {
      g.entries.sort((x, y) => new Date(x.deadline).getTime() - new Date(y.deadline).getTime())
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.hasOverdue !== b.hasOverdue) return a.hasOverdue ? -1 : 1
      return a.businessName.localeCompare(b.businessName)
    })
  }, [calendarEntries, modelFilter, quarterFilter, search])

  const overdueBusinesses = useMemo(() => grouped.filter((g) => g.hasOverdue).length, [grouped])

  const handleMarkPresented = async (entryId: string) => {
    setActionLoadingId(entryId)
    try {
      const res = await apiFetch(`/api/documents/tax-calendar/${entryId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_presented: true,
          presented_date: new Date().toISOString().split("T")[0],
        }),
      })

      if (!res.ok) throw new Error("Error actualizando entrada")

      await mutateTaxCalendar()

      await globalMutate("/api/business/companies/")

      window.dispatchEvent(new Event("consultoritas:refresh"))

      toast.success("Entrada marcada como presentada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Matriz de Cumplimiento</h2>
        <p className="text-muted-foreground mt-1">Vista agrupada por cliente para operar el calendario fiscal sin fricción.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Filter className="size-4" /> Filtros Pro</CardTitle>
          <CardDescription>Busca por cliente y filtra por modelo y trimestre.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." />
          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Modelo: Todos</SelectItem>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={quarterFilter} onValueChange={setQuarterFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Trimestre: Todos</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Clientes con riesgo inmediato: <span className="font-semibold text-rose-600">{overdueBusinesses}</span>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Clientes y Obligaciones</CardTitle>
          <CardDescription>Los clientes con vencimientos pendientes aparecen primero.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-md border p-4 space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay datos para los filtros seleccionados.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {grouped.map((group) => (
                <AccordionItem
                  key={group.businessId}
                  value={group.businessId}
                  className={cn("mb-3 rounded-md border px-3", group.hasOverdue && "border-2 border-rose-600 bg-rose-50/30")}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{group.businessName}</span>
                      {group.hasOverdue && (
                        <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50">Vencido</Badge>
                      )}
                      <Badge variant="secondary">{group.entries.length} modelos</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {group.entries.map((entry) => {
                        const overdue = !entry.is_presented && isOverdue(entry.deadline)
                        const left = daysUntil(entry.deadline)
                        const isBusy = actionLoadingId === entry.id
                        return (
                          <div key={entry.id} className="p-3 rounded-md border bg-background flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-sm">Modelo {toModelCode(entry)} · {entry.tax_type}</div>
                              <div className="text-xs text-muted-foreground">{toQuarter(entry)} · {entry.period}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">{new Date(entry.deadline).toLocaleDateString("es-ES")}</div>
                              {entry.is_presented ? (
                                <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50"><CheckCircle2 className="size-3 mr-1" />Presentado</Badge>
                              ) : overdue ? (
                                <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50"><AlertCircle className="size-3 mr-1" />Vencido</Badge>
                              ) : (
                                <Badge variant="outline">{left} días</Badge>
                              )}
                            </div>
                            {!entry.is_presented && (
                              <Button size="sm" variant="outline" type="button" onClick={() => handleMarkPresented(entry.id)} disabled={isBusy}>
                                {isBusy ? <Loader2 className="size-3 animate-spin" /> : "Marcar presentada"}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
