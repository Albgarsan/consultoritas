"use client"

import { useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, FileSearch, CalendarClock } from "lucide-react"
import { NovedadesFiscales } from "@/components/shared/news-feed"
import { type TaxCalendarEntry } from "@/lib/api"
import { useApiData } from "@/lib/use-api"

function parseLocalDateYYYYMMDD(dateStr?: string | null): Date {
  if (!dateStr || typeof dateStr !== "string") return new Date(NaN)
  const parts = dateStr.split("-").map(Number)
  if (parts.length < 3) return new Date(NaN)
  const [year, month, day] = parts
  return new Date(year, (month || 1) - 1, day || 1)
}

type BusinessRow = {
  id: string
  name: string
  tax_status?: "AL DÍA" | "INCIDENCIA" | string
}

interface AdvisorViewProps {
  onNavigate: (view: string) => void
}

export function AdvisorView({ onNavigate }: AdvisorViewProps) {
  const currentYear = new Date().getFullYear()
  const { data: businesses = [], mutate: mutateBusinesses, isLoading: isBusinessesLoading } = useApiData<BusinessRow[]>(
    "/api/business/companies/",
    { dedupingInterval: 60_000 },
  )
  const { data: allCalendar = [], mutate: mutateCalendar, isLoading: isCalendarLoading } = useApiData<TaxCalendarEntry[]>(
    `/api/documents/tax-calendar/?year=${currentYear}`,
    { dedupingInterval: 300_000, revalidateOnFocus: false },
  )
  const isLoading = isBusinessesLoading || isCalendarLoading

  useEffect(() => {
    const refresh = () => {
      void mutateBusinesses()
      void mutateCalendar()
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
  }, [mutateBusinesses, mutateCalendar])

  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return [...allCalendar]
      .filter((row: TaxCalendarEntry) => parseLocalDateYYYYMMDD(row.deadline) >= today)
      .sort((a: TaxCalendarEntry, b: TaxCalendarEntry) => parseLocalDateYYYYMMDD(a.deadline).getTime() - parseLocalDateYYYYMMDD(b.deadline).getTime())
      .slice(0, 5)
  }, [allCalendar])

  const overdueCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allCalendar.filter((row) => !row.is_presented && parseLocalDateYYYYMMDD(row.deadline) < today).length
  }, [allCalendar])

  const portfolio = useMemo(() => {
    const ok = businesses.filter((b) => b.tax_status === "AL DÍA").length
    const incidence = businesses.filter((b) => b.tax_status === "INCIDENCIA").length
    const total = businesses.length
    const okPct = total > 0 ? Math.round((ok / total) * 100) : 0
    return { ok, incidence, total, okPct }
  }, [businesses])

  const donutStyle = {
    background: `conic-gradient(#10b981 ${portfolio.okPct}%, #ef4444 ${portfolio.okPct}% 100%)`,
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-28 w-full rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-52" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión del Despacho</h2>
          <p className="text-sm text-muted-foreground">Panel operativo para gestionar la cartera y obligaciones fiscales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("clientes")} className="gap-2">
            <Users className="size-4" /> Mi Cartera
          </Button>
          <Button size="sm" onClick={() => onNavigate("validacion")} className="gap-2 bg-primary">
            <FileSearch className="size-4" /> Validar Pendientes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Estado de Cartera</CardTitle>
            <CardDescription>Clientes al día vs con incidencias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="size-28 rounded-full" style={donutStyle}>
                <div className="m-4 size-20 rounded-full bg-background flex items-center justify-center text-sm font-semibold">
                  {portfolio.total}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Al día: {portfolio.ok}</div>
                <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-red-500" /> Incidencias: {portfolio.incidence}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Urgencia Máxima</CardTitle>
            <CardDescription>Total de modelos vencidos en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-red-600">{overdueCount}</div>
            <Button className="w-full" variant="destructive" onClick={() => onNavigate("compliance")}>
              Revisar cumplimiento
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Próximos Vencimientos</CardTitle>
            <CardDescription>5 hitos fiscales más cercanos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No hay vencimientos próximos.</p>}
            {upcoming.map((item) => {
              const deadline = parseLocalDateYYYYMMDD(item.deadline)
              const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
              return (
                <div key={item.id} className="p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{item.business_name || item.business?.name || "Cliente"}</div>
                    <Badge variant="outline" className="text-xs">{daysLeft} días</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{item.tax_type} · {item.period}</div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="size-4" /> Novedades Fiscales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NovedadesFiscales />
        </CardContent>
      </Card>
    </div>
  )
}
