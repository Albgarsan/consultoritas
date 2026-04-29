"use client"

import { useState } from "react"
import { Search, Plus, Eye, Bot, Building2, User, AlertCircle, CheckCircle2, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const clients = [
  { id: "1", name: "María Castro", cif: "12345678A", type: "autonomo", taxStatus: "ok", iaStatus: "active", avatar: "MC" },
  { id: "2", name: "Tech Solutions SL", cif: "B12345678", type: "pyme", taxStatus: "alert", iaStatus: "alert", avatar: "TS" },
  { id: "3", name: "Bar El Rincón", cif: "B87654321", type: "pyme", taxStatus: "ok", iaStatus: "active", avatar: "BR" },
]

interface GestionClientesProps {
  onNavigateToMonitor: (clientId: string) => void
}

export function GestionClientes({ onNavigateToMonitor }: GestionClientesProps) {
  const [search, setSearch] = useState("")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Cartera de Clientes</h2>
          <p className="text-sm text-muted-foreground">Supervisión de estados fiscales y actividad.</p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="size-4" /> Nuevo Cliente
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o CIF..."
              className="pl-9 bg-muted/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Estado Fiscal</TableHead>
              <TableHead>Monitor IA</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8 border">
                      <AvatarFallback className="text-[10px] font-bold bg-muted">{client.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{client.name}</p>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        {client.type === "pyme" ? <Building2 className="size-2.5" /> : <User className="size-2.5" />}
                        {client.type}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{client.cif}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={client.taxStatus === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                    {client.taxStatus === "ok" ? <CheckCircle2 className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                    {client.taxStatus === "ok" ? "Al día" : "Incidencia"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/5 gap-2"
                    onClick={() => onNavigateToMonitor(client.id)}
                  >
                    <Bot className="size-3.5" /> Supervisar
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Eye className="size-4 mr-2" /> Ficha Cliente</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Suspender</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
