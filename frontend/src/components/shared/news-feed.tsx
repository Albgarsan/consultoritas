"use client"

import { Bot, Newspaper } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function NovedadesFiscales() {
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
                Sin noticias sincronizadas
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          Conecta una fuente oficial para mostrar novedades reales.
        </div>
      </CardContent>
    </Card>
  )
}
