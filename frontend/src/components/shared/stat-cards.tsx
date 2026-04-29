"use client"

import { TrendingUp, TrendingDown, Receipt, Wallet, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const metrics = [
  {
    title: "IVA del Trimestre",
    value: "3.245,80 €",
    description: "A pagar el 20 de abril",
    trend: "up",
    trendValue: "+12%",
    icon: Receipt,
  },
  {
    title: "IRPF Previsto",
    value: "8.920,00 €",
    description: "Estimación anual",
    trend: "down",
    trendValue: "-5%",
    icon: Wallet,
  },
  {
    title: "Gastos Totales",
    value: "12.450,30 €",
    description: "Este trimestre",
    trend: "up",
    trendValue: "+8%",
    icon: FileText,
  },
]

export function FiscalHealthCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metric.value}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`flex items-center text-xs font-medium ${
                  metric.trend === "up" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {metric.trend === "up" ? (
                  <TrendingUp className="size-3 mr-1" />
                ) : (
                  <TrendingDown className="size-3 mr-1" />
                )}
                {metric.trendValue}
              </span>
              <span className="text-xs text-muted-foreground">{metric.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
