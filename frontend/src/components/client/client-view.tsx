"use client"

import { useEffect, useState } from "react"
import { FiscalHealthCards } from "../shared/stat-cards"
import { IncomeExpenseChart } from "../shared/chart/revenue"
import { IVAComparisonChart } from "../shared/chart/tax-comparison"
import { AccountingCalendar } from "@/components/shared/calendar"
import { TaxStatus } from "@/components/shared/tax-status"
import { PremiumAIChat } from "@/components/shared/ai/full-chat"
import { NovedadesFiscales } from "../shared/news-feed"
import { Button } from "@/components/ui/button"
import { apiFetch, type DocumentoFacturacion, type TaxCalendarEntry } from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, Calendar, FileText } from "lucide-react"

interface DashboardViewProps {
  onNavigate: (view: string) => void
  user?: { first_name?: string; email?: string } | null
  documents?: DocumentoFacturacion[]
  stats?: any
  calendarEntries?: TaxCalendarEntry[]
  isLoading?: boolean
}

type Period = "trimestre" | "semestre" | "anual"

export function DashboardView({ onNavigate, user, documents = [], stats, calendarEntries = [], isLoading = false }: DashboardViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("trimestre")

  const validatedDocuments = documents.filter(
    (doc) => (doc.status || "").toLowerCase() === "procesado"
  )

  return (
    <div className="space-y-6">
      {/* Welcome Section with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Bienvenida de nuevo, {user?.first_name || "Cliente"}
          </h2>
          <p className="text-muted-foreground">
            Este es el resumen de tu salud fiscal. Todo bajo control.
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

      {/* Fiscal Health Cards */}
      <FiscalHealthCards stats={stats} />

      {/* Novedades Fiscales */}
      <NovedadesFiscales />

      {/* Charts Grid - Ingresos/Gastos and IVA Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeExpenseChart period={selectedPeriod} stats={stats} isLoading={isLoading} />
        <IVAComparisonChart period={selectedPeriod} stats={stats} isLoading={isLoading} />
      </div>

      {/* Accounting Calendar and AI Chat */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountingCalendar calendarEntries={calendarEntries} useRealCalendar />
        <TaxStatus documents={validatedDocuments} calendarEntries={calendarEntries} useRealCalendar />
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <PremiumAIChat />
      </div>
    </div>
  )
}
