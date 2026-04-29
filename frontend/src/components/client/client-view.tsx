"use client"

import { useState } from "react"
import { FiscalHealthCards } from "../shared/stat-cards"
import { IncomeExpenseChart } from "../shared/chart/revenue"
import { IVAComparisonChart } from "../shared/chart/tax-comparison"
import { AccountingCalendar } from "@/components/shared/calendar"
import { PremiumAIChat } from "@/components/shared/ai/full-chat"
import { NovedadesFiscales } from "../shared/news-feed"
import { Button } from "@/components/ui/button"
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
}

type Period = "trimestre" | "semestre" | "anual"

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("trimestre")

  return (
    <div className="space-y-6">
      {/* Welcome Section with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Bienvenida de nuevo, María
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
          <Button onClick={() => onNavigate("documentos")} className="gap-2">
            <Upload className="size-4" />
            Subir Factura
          </Button>
        </div>
      </div>

      {/* Fiscal Health Cards */}
      <FiscalHealthCards />

      {/* Novedades Fiscales */}
      <NovedadesFiscales />

      {/* Charts Grid - Ingresos/Gastos and IVA Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeExpenseChart period={selectedPeriod} />
        <IVAComparisonChart period={selectedPeriod} />
      </div>

      {/* Accounting Calendar and AI Chat */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountingCalendar />
        <PremiumAIChat />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => onNavigate("documentos")}
        >
          <Upload className="size-5 text-primary" />
          <span className="text-sm">Subir Documento</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => onNavigate("documentos")}
        >
          <FileText className="size-5 text-accent" />
          <span className="text-sm">Ver Facturas</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => onNavigate("facturacion")}
        >
          <Calendar className="size-5 text-emerald-600" />
          <span className="text-sm">Calendario Fiscal</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => onNavigate("ajustes")}
        >
          <FileText className="size-5 text-amber-600" />
          <span className="text-sm">Mis Datos</span>
        </Button>
      </div>
    </div>
  )
}
