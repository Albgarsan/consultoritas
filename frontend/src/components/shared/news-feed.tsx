"use client"

import { Bot, ExternalLink, Newspaper, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const novedades = [
  {
    id: "1",
    titulo: "Nuevo límite de facturación para módulos en 2026",
    resumen: "La Agencia Tributaria ha actualizado el límite de facturación para el régimen de estimación objetiva (módulos), pasando de 250.000€ a 225.000€ anuales.",
    fuente: "BOE",
    fecha: "Hoy",
    categoria: "IRPF",
    relevancia: "alta",
  },
  {
    id: "2",
    titulo: "Prórroga de la reducción del IVA en alimentos básicos",
    resumen: "Se extiende hasta el 30 de junio la reducción del IVA al 0% en productos de primera necesidad como pan, leche, frutas y verduras.",
    fuente: "BOE",
    fecha: "Ayer",
    categoria: "IVA",
    relevancia: "alta",
  },
  {
    id: "3",
    titulo: "Cambios en las deducciones por vehículo eléctrico",
    resumen: "Nueva deducción del 15% en el IRPF para la adquisición de vehículos eléctricos nuevos, con un límite de 3.000€ de base de deducción.",
    fuente: "AEAT",
    fecha: "Hace 2 días",
    categoria: "IRPF",
    relevancia: "media",
  },
  {
    id: "4",
    titulo: "Actualización del calendario fiscal Q2 2026",
    resumen: "Recordatorio: El plazo para la presentación del modelo 303 del primer trimestre finaliza el 20 de abril. Modelo 111 y 115 también en la misma fecha.",
    fuente: "AEAT",
    fecha: "Hace 3 días",
    categoria: "General",
    relevancia: "media",
  },
]

export function NovedadesFiscales() {
  const getRelevanciaColor = (relevancia: string) => {
    switch (relevancia) {
      case "alta":
        return "bg-rose-50 text-rose-700 border-rose-200"
      case "media":
        return "bg-amber-50 text-amber-700 border-amber-200"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case "IVA":
        return "bg-primary/10 text-primary border-primary/20"
      case "IRPF":
        return "bg-accent/10 text-accent border-accent/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
              <Newspaper className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Novedades Fiscales y del BOE</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-0.5">
                <Bot className="size-3" />
                Supervisión IA
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <TrendingUp className="size-3 mr-1" />
            4 nuevas
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-3">
            {novedades.map((novedad) => (
              <div
                key={novedad.id}
                className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors bg-card"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-medium text-foreground leading-tight">
                    {novedad.titulo}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${getRelevanciaColor(novedad.relevancia)}`}
                  >
                    {novedad.relevancia === "alta" ? "Urgente" : "Info"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {novedad.resumen}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getCategoriaColor(novedad.categoria)}`}>
                      {novedad.categoria}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{novedad.fuente}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{novedad.fecha}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <ExternalLink className="size-3 mr-1" />
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
