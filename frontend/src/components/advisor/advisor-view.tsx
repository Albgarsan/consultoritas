"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, FileClock, FileSearch, Users } from "lucide-react"
import { type TaxCalendarEntry } from "@/lib/api"
import { useApiData } from "@/lib/use-api"

type BusinessRow = {
  id: string
  name: string
  tax_status?: "AL DÍA" | "INCIDENCIA" | string
}

type DocumentRow = {
  id: string | number
  file_name?: string
  status?: string
  uploaded_at?: string
  business?: { name?: string }
  uploaded_by?: { first_name?: string; email?: string }
}

type AdvisorOption = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

interface AdvisorViewProps {
  onNavigate: (view: string) => void
}

type Quarter = "Q1" | "Q2" | "Q3" | "Q4"

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

export function AdvisorView({ onNavigate }: AdvisorViewProps) {
  const currentYear = new Date().getFullYear()
  const currentQuarter = quarterFromDate(new Date())

  const { data: businesses = [], mutate: mutateBusinesses, isLoading: isBusinessesLoading } = useApiData<BusinessRow[]>(
    "/api/business/companies/",
    { dedupingInterval: 60_000 },
  )
  const { data: allCalendar = [], mutate: mutateCalendar, isLoading: isCalendarLoading } = useApiData<TaxCalendarEntry[]>(
    `/api/documents/tax-calendar/?year=${currentYear}`,
    { dedupingInterval: 120_000, revalidateOnFocus: false },
  )
  const { data: advisors = [] } = useApiData<AdvisorOption[]>("/api/users/advisors/", {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>("all")
  const { data: documents = [], mutate: mutateDocuments, isLoading: isDocumentsLoading } = useApiData<DocumentRow[]>(
    "/api/documents/",
    { dedupingInterval: 20_000 },
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversations = [] } = useApiData<any[]>("/api/ai/conversations/")

  const isLoading = isBusinessesLoading || isCalendarLoading || isDocumentsLoading

  useEffect(() => {
    const refresh = () => {
      void mutateBusinesses()
      void mutateCalendar()
      void mutateDocuments()
    }
    window.addEventListener("consultoritas:refresh", refresh)
    window.addEventListener("consultoritas:documents-updated", refresh)
    window.addEventListener("consultoritas:clients-updated", refresh)
    window.addEventListener("consultoritas:appointments-updated", refresh)
    return () => {
      window.removeEventListener("consultoritas:refresh", refresh)
      window.removeEventListener("consultoritas:documents-updated", refresh)
      window.removeEventListener("consultoritas:clients-updated", refresh)
      window.removeEventListener("consultoritas:appointments-updated", refresh)
    }
  }, [mutateBusinesses, mutateCalendar, mutateDocuments])

  const pendingDocuments = useMemo(
    () => documents.filter((doc) => doc.status === "Pendiente"),
    [documents],
  )

  const pendingByClient = useMemo(() => {
    const map = new Map<string, number>()
    for (const doc of pendingDocuments) {
      const key = doc.business?.name || doc.uploaded_by?.first_name || doc.uploaded_by?.email || "Sin identificar"
      map.set(key, (map.get(key) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([client, count]) => ({ client, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [pendingDocuments])

  const VALID_MODELS = ["111", "115", "123", "130", "202", "303"];

  const filteredCalendar = useMemo(() => {
    if (selectedAdvisor === "all") return allCalendar
    const selectedAdvisorLower = selectedAdvisor.trim().toLowerCase()
    return allCalendar.filter((item) => {
      const advisorId = item.business?.responsible_advisor_id?.trim()
      if (advisorId && advisorId === selectedAdvisor) return true
      const advisorName = item.business?.responsible_advisor_name?.trim().toLowerCase()
      if (!advisorName) return false
      if (advisorName === selectedAdvisorLower) return true
      if (advisorName.includes(selectedAdvisorLower)) return true
      return false
    })
  }, [allCalendar, selectedAdvisor])

  const currentQuarterModels = useMemo(() => {
    const map = new Map<string, { model: string; clients: Set<string>; presented: number; pending: number }>()
    for (const model of VALID_MODELS) {
      map.set(model, { model, clients: new Set<string>(), presented: 0, pending: 0 })
    }
    for (const item of filteredCalendar) {
      const d = parseLocalDateYYYYMMDD(item.period_start)
      if (d.getFullYear() !== currentYear) continue
      if (quarterFromDate(d) !== currentQuarter) continue
      const model = toModelCode(item.tax_type)
      if (!VALID_MODELS.includes(model)) continue
      const entry = map.get(model)!
      if (item.business?.id) entry.clients.add(item.business.id)
      if (item.is_presented) entry.presented += 1
      else entry.pending += 1
    }
    return VALID_MODELS.map((m) => map.get(m)!)
  }, [filteredCalendar, currentQuarter, currentYear])

  const advisorOptions = useMemo(() => {
    return advisors.map((advisor) => ({
      id: advisor.id,
      label: [advisor.first_name, advisor.last_name].filter(Boolean).join(" ").trim() || advisor.email || "Asesor",
    }))
  }, [advisors])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ratedChats = conversations.filter((c: any) => c.rating && c.rating > 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avgRating = ratedChats.length ? (ratedChats.reduce((acc: number, c: any) => acc + c.rating, 0) / ratedChats.length).toFixed(1) : "N/D"

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control Trimestral del Despacho</h2>
          <p className="text-sm text-muted-foreground">Prioriza carga documental urgente, seguimiento trimestral e incidencias activas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("clientes")} className="gap-2">
            <Users className="size-4" /> Mi Cartera
          </Button>
          <Button size="sm" onClick={() => onNavigate("validacion")} className="gap-2">
            <FileSearch className="size-4" /> Validación documental
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-rose-200 bg-rose-50/40 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileClock className="size-4 text-rose-700" /> Carga Urgente
            </CardTitle>
            <CardDescription>Facturas pendientes de validar por cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-rose-700">{pendingDocuments.length}</div>
            {pendingByClient.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay pendientes en este momento.</p>
            ) : (
              pendingByClient.map((row) => (
                <div key={row.client} className="flex items-center justify-between rounded-md border bg-white p-2 text-sm">
                  <span className="truncate">{row.client}</span>
                  <Badge variant="outline" className="border-rose-300 text-rose-700">{row.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 shadow-sm lg:col-span-2 bg-white">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Campaña Trimestral Activa ({currentQuarter})</CardTitle>
                <CardDescription className="mt-1">Seguimiento en tiempo real de los modelos del trimestre en curso.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                  <SelectTrigger className="md:w-48">
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
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  {currentYear}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {currentQuarterModels.length === 0 ? (
              <div className="flex h-32 items-center justify-center bg-slate-50/50">
                <p className="text-sm text-slate-500">No hay modelos obligatorios registrados para el trimestre actual.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600">Modelo</TableHead>
                    <TableHead className="text-center font-semibold text-slate-600">Obligados</TableHead>
                    <TableHead className="text-center font-semibold text-slate-600">Presentados</TableHead>
                    <TableHead className="text-center font-semibold text-slate-600">Pendientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentQuarterModels.map((entry) => (
                    <TableRow key={entry.model} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-800">{entry.model}</TableCell>
                      <TableCell className="text-center"><span className="text-sm font-medium text-slate-600">{entry.clients.size}</span></TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 text-sm font-bold shadow-sm">{entry.presented}</Badge></div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center"><Badge variant="outline" className={entry.pending > 0 ? "bg-rose-50 text-rose-700 border-rose-200 px-3 py-1 text-sm font-bold shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 px-3 py-1 text-sm font-medium"}>{entry.pending}</Badge></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:w-1/2">
        <Card className="border-border/50 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-600" /> Alertas en Consultor IA
              </span>
              <span className="text-xl font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                ⭐ {avgRating} <span className="text-xs font-normal">/ 5</span>
              </span>
            </CardTitle>
            <CardDescription>Atención humana requerida en el Chatbot.</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pendingReview = conversations.filter((c: any) => c.unread_alerts && (c.security_alert || c.has_incident))
              if (pendingReview.length === 0) {
                return <p className="text-sm text-muted-foreground mb-6 mt-2">Todo al día. No hay alertas pendientes de revisión.</p>
              }
              return (
                <div className="flex flex-col items-center justify-center py-4 mb-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <span className="text-5xl font-black text-rose-600 mb-1">{pendingReview.length}</span>
                    <span className="text-sm font-medium text-rose-800">Chats pendientes de revisar</span>
                </div>
              )
            })()}
            <Button variant="outline" className="w-full" onClick={() => onNavigate("monitor-ia")}>
              Ir al Monitor IA
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
