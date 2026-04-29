"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { TrendingUp, TrendingDown } from "lucide-react"

interface IncomeExpenseChartProps {
  period: "trimestre" | "semestre" | "anual"
}

const quarterlyData = [
  { month: "Ene", ingresos: 19200, gastos: 11500 },
  { month: "Feb", ingresos: 24600, gastos: 13200 },
  { month: "Mar", ingresos: 26800, gastos: 12450 },
]

const semesterData = [
  { month: "Oct", ingresos: 18500, gastos: 12200 },
  { month: "Nov", ingresos: 22300, gastos: 14100 },
  { month: "Dic", ingresos: 28100, gastos: 16800 },
  { month: "Ene", ingresos: 19200, gastos: 11500 },
  { month: "Feb", ingresos: 24600, gastos: 13200 },
  { month: "Mar", ingresos: 26800, gastos: 12450 },
]

const annualData = [
  { month: "Abr", ingresos: 15200, gastos: 9800 },
  { month: "May", ingresos: 16800, gastos: 10200 },
  { month: "Jun", ingresos: 18100, gastos: 11500 },
  { month: "Jul", ingresos: 14500, gastos: 9200 },
  { month: "Ago", ingresos: 12800, gastos: 8500 },
  { month: "Sep", ingresos: 17200, gastos: 10800 },
  { month: "Oct", ingresos: 18500, gastos: 12200 },
  { month: "Nov", ingresos: 22300, gastos: 14100 },
  { month: "Dic", ingresos: 28100, gastos: 16800 },
  { month: "Ene", ingresos: 19200, gastos: 11500 },
  { month: "Feb", ingresos: 24600, gastos: 13200 },
  { month: "Mar", ingresos: 26800, gastos: 12450 },
]

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--chart-1)",
  },
  gastos: {
    label: "Gastos",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function IncomeExpenseChart({ period }: IncomeExpenseChartProps) {
  const data = period === "trimestre" ? quarterlyData : period === "semestre" ? semesterData : annualData

  // Calculate totals
  const totalIngresos = data.reduce((sum, item) => sum + item.ingresos, 0)
  const totalGastos = data.reduce((sum, item) => sum + item.gastos, 0)
  const balance = totalIngresos - totalGastos
  const percentChange = ((totalIngresos - totalGastos) / totalGastos * 100).toFixed(1)
  const isPositive = balance >= 0

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Ingresos vs Gastos</CardTitle>
            <CardDescription>Resumen financiero del periodo</CardDescription>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            <span className="font-semibold text-sm">
              {isPositive ? "+" : ""}{balance.toLocaleString("es-ES")}€
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
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="ingresos"
              fill="var(--color-ingresos)"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
            <Bar
              dataKey="gastos"
              fill="var(--color-gastos)"
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
              <p className="text-xs text-muted-foreground">Total Ingresos</p>
              <p className="font-semibold text-foreground">{totalIngresos.toLocaleString("es-ES")}€</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--chart-2)" }} />
            <div>
              <p className="text-xs text-muted-foreground">Total Gastos</p>
              <p className="font-semibold text-foreground">{totalGastos.toLocaleString("es-ES")}€</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
