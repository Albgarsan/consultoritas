"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface IVAComparisonChartProps {
  period: "trimestre" | "semestre" | "anual"
  stats?: any
  isLoading?: boolean
}

const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

const chartConfig = {
  soportado: {
    label: "IVA Soportado",
    color: "var(--chart-2)",
  },
  repercutido: {
    label: "IVA Repercutido",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function IVAComparisonChart({ period, stats, isLoading = false }: IVAComparisonChartProps) {
  const { data, totalSoportado, totalRepercutido, balance, isPositive } = useMemo(() => {
    const monthCount = period === "trimestre" ? 3 : period === "semestre" ? 6 : 12

    const now = new Date()
    const chartData = Array.from({ length: monthCount }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1)
      const yr = monthDate.getFullYear()
      const mStart = (monthDate.getMonth() + 1).toString().padStart(2, '0')
      const mStr = `${yr}-${mStart}`

      const found = (stats?.trends || []).find((t: any) => t.name === mStr)

      return {
        month: monthLabels[monthDate.getMonth()],
        soportado: found?.soportado || 0,
        repercutido: found?.repercutido || 0
      }
    })

    const totSoportado = chartData.reduce((sum, item) => sum + item.soportado, 0)
    const totRepercutido = chartData.reduce((sum, item) => sum + item.repercutido, 0)
    const bal = totRepercutido - totSoportado

    return {
      data: chartData,
      totalSoportado: totSoportado,
      totalRepercutido: totRepercutido,
      balance: bal,
      isPositive: bal >= 0
    }
  }, [period, stats])

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Comparativa IVA</CardTitle>
              <CardDescription>IVA Soportado vs Repercutido</CardDescription>
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full mt-4" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats || !stats.trends || stats.trends.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Comparativa IVA</CardTitle>
          <CardDescription>No hay documentos sincronizados para calcular el IVA.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Comparativa IVA</CardTitle>
            <CardDescription>IVA Soportado vs Repercutido</CardDescription>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            <span className="font-semibold text-sm">
              {isPositive ? "A pagar:" : "A devolver:"} {Math.abs(balance).toLocaleString("es-ES")}€
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              width={40}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="repercutido"
              fill="var(--color-repercutido)"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
            <Bar
              dataKey="soportado"
              fill="var(--color-soportado)"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ChartContainer>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--chart-1)" }} />
            <div>
              <p className="text-xs text-muted-foreground">IVA Repercutido (Ventas)</p>
              <p className="font-semibold text-foreground">{totalRepercutido.toLocaleString("es-ES")}€</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--chart-2)" }} />
            <div>
              <p className="text-xs text-muted-foreground">IVA Soportado (Compras)</p>
              <p className="font-semibold text-foreground">{totalSoportado.toLocaleString("es-ES")}€</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
