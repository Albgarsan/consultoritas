"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FiscalHealthCards } from "@/components/shared/stat-cards"
import { IncomeExpenseChart } from "@/components/shared/chart/revenue"
import { IVAComparisonChart } from "@/components/shared/chart/tax-comparison"
import { NovedadesFiscales } from "@/components/shared/news-feed"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FileSearch, Brain, ArrowUpRight } from "lucide-react"

interface AdvisorViewProps {
  onNavigate: (view: string) => void
}

export function AdvisorView({ onNavigate }: AdvisorViewProps) {
  return (
    <div className="space-y-6">
      {/* Cabecera de Gestión Rápida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión del Despacho</h2>
          <p className="text-sm text-muted-foreground">Resumen global de cartera y rendimiento de IA.</p>
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

      {/* KPIs Generales del Despacho */}
      <FiscalHealthCards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Gráfico de Facturación Total */}
        <Card className="col-span-4 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Facturación Trimestral Global</CardTitle>
            <CardDescription>Ingresos acumulados de todos los clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart period={"trimestre"} />
          </CardContent>
        </Card>

        {/* Estado de la Cartera */}
        <Card className="col-span-3 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Cumplimiento Fiscal</CardTitle>
            <CardDescription>Estado de modelos por cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <IVAComparisonChart period={"trimestre"} />
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground font-medium uppercase">Modelos Presentados</span>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">85%</Badge>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground font-medium uppercase">Pendientes Validación</span>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-[10px]">12 Docs</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Monitor de Salud IA */}
        <Card className="bg-primary/[0.02] border-primary/20">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Brain className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Rendimiento IA</CardTitle>
              <CardDescription>Extracción de datos</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">99.2%</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">Precisión media este mes</p>
            <Button variant="link" className="px-0 mt-4 text-xs text-primary gap-1" onClick={() => onNavigate("monitor-ia")}>
              Ir al monitor técnico <ArrowUpRight className="size-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Feed de Noticias AEAT (Shared) */}
        <div className="col-span-2">
          <NovedadesFiscales />
        </div>
      </div>
    </div>
  )
}
