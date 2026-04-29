"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { TrendingUp, TrendingDown } from "lucide-react"

interface IVAComparisonChartProps {
  period: "trimestre" | "semestre" | "anual"
}

const quarterlyData = [
  { month: "Ene", soportado: 2480, repercutido: 3885 },
  { month: "Feb", soportado: 2772, repercutido: 5166 },
  { month: "Mar", soportado: 2614, repercutido: 5628 },
]

const semesterData = [
  { month: "Oct", soportado: 2562, repercutido: 3885 },
  { month: "Nov", soportado: 2961, repercutido: 4683 },
  { month: "Dic", soportado: 3528, repercutido: 5901 },
  { month: "Ene", soportado: 2415, repercutido: 4032 },
  { month: "Feb", soportado: 2772, repercutido: 5166 },
  { month: "Mar", soportado: 2614, repercutido: 5628 },
]

const annualData = [
  { month: "Abr", soportado: 2100, repercutido: 3200 },
  { month: "May", soportado: 2300, repercutido: 3500 },
  { month: "Jun", soportado: 2450, repercutido: 3800 },
  { month: "Jul", soportado: 2200, repercutido: 3400 },
  { month: "Ago", soportado: 1800, repercutido: 2800 },
  { month: "Sep", soportado: 2400, repercutido: 3700 },
  { month: "Oct", soportado: 2562, repercutido: 3885 },
  { month: "Nov", soportado: 2961, repercutido: 4683 },
  { month: "Dic", soportado: 3528, repercutido: 5901 },
  { month: "Ene", soportado: 2415, repercutido: 4032 },
  { month: "Feb", soportado: 2772, repercutido: 5166 },
  { month: "Mar", soportado: 2614, repercutido: 5628 },
]

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

export function IVAComparisonChart({ period }: IVAComparisonChartProps) {
  const data = period === "trimestre" ? quarterlyData : period === "semestre" ? semesterData : annualData

  // Calculate totals
  const totalSoportado = data.reduce((sum, item) => sum + item.soportado, 0)
  const totalRepercutido = data.reduce((sum, item) => sum + item.repercutido, 0)
  const balance = totalRepercutido - totalSoportado
  const isPositive = balance >= 0

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
