"use client"

import { useState } from "react"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  Eye,
  Download,
  Send,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Invoice {
  id: string
  number: string
  client: string
  concept: string
  amount: number
  date: string
  status: "pagada" | "pendiente" | "borrador" | "enviada"
}

const facturasRecibidas: Invoice[] = [
  { id: "1", number: "FR-2026-089", client: "Hosting Cloud S.L.", concept: "Hosting anual", amount: 240.00, date: "10/03/2026", status: "pagada" },
  { id: "2", number: "FR-2026-088", client: "Office Supplies", concept: "Material oficina", amount: 156.80, date: "05/03/2026", status: "pagada" },
  { id: "3", number: "FR-2026-087", client: "Adobe Systems", concept: "Creative Cloud", amount: 59.99, date: "01/03/2026", status: "pagada" },
  { id: "4", number: "FR-2026-086", client: "Telefónica", concept: "Línea móvil", amount: 45.00, date: "28/02/2026", status: "pagada" },
  { id: "5", number: "FR-2026-085", client: "WeWork Madrid", concept: "Coworking febrero", amount: 350.00, date: "25/02/2026", status: "pendiente" },
]

const facturasEmitidas: Invoice[] = [
  { id: "1", number: "FE-2026-012", client: "Servicios Digitales S.L.", concept: "Desarrollo web - Fase 2", amount: 1512.50, date: "12/03/2026", status: "enviada" },
  { id: "2", number: "FE-2026-011", client: "Marketing Pro", concept: "Consultoría SEO", amount: 750.00, date: "05/03/2026", status: "pagada" },
  { id: "3", number: "FE-2026-010", client: "TechStartup Inc.", concept: "Diseño UX/UI App", amount: 2420.00, date: "28/02/2026", status: "pagada" },
  { id: "4", number: "FE-2026-009", client: "Consultora López", concept: "Desarrollo landing", amount: 605.00, date: "20/02/2026", status: "pagada" },
  { id: "5", number: "FE-2026-013", client: "Nuevo Cliente", concept: "Propuesta proyecto", amount: 1800.00, date: "15/03/2026", status: "borrador" },
]

const statusConfig = {
  pagada: { label: "Pagada", className: "bg-emerald-500/10 text-emerald-600 border-0" },
  pendiente: { label: "Pendiente", className: "bg-amber-500/10 text-amber-600 border-0" },
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-0" },
  enviada: { label: "Enviada", className: "bg-primary/10 text-primary border-0" },
}

export function FacturacionView() {
  const [activeTab, setActiveTab] = useState("recibidas")

  const totalIngresos = facturasEmitidas
    .filter(f => f.status === "pagada")
    .reduce((acc, f) => acc + f.amount, 0)

  const totalGastos = facturasRecibidas
    .filter(f => f.status === "pagada")
    .reduce((acc, f) => acc + f.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Resumen de Facturación
          </h2>
          <p className="text-muted-foreground">
            Gestiona tus facturas emitidas y recibidas.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Crear Nueva Factura
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Ingresos Trimestre</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalIngresos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="size-6 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <ArrowUpRight className="size-4 text-emerald-600" />
              <span className="text-emerald-600 font-medium">+12.5%</span>
              <span className="text-muted-foreground">vs trimestre anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Gastos Trimestre</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalGastos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="size-6 text-rose-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <ArrowDownRight className="size-4 text-rose-600" />
              <span className="text-rose-600 font-medium">-3.2%</span>
              <span className="text-muted-foreground">vs trimestre anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Tabs */}
      <Card className="border-border/50">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="recibidas" className="gap-2">
                <Receipt className="size-4" />
                Facturas Recibidas
              </TabsTrigger>
              <TabsTrigger value="emitidas" className="gap-2">
                <FileText className="size-4" />
                Facturas Emitidas
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="recibidas" className="m-0">
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Nº Factura</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasRecibidas.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="pl-6 font-medium">{invoice.number}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.concept}</TableCell>
                      <TableCell className="font-medium">
                        {invoice.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[invoice.status].className}>
                          {statusConfig[invoice.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="size-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="size-4 mr-2" />
                              Descargar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="emitidas" className="m-0">
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Nº Factura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasEmitidas.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="pl-6 font-medium">{invoice.number}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.concept}</TableCell>
                      <TableCell className="font-medium">
                        {invoice.amount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{invoice.date}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[invoice.status].className}>
                          {statusConfig[invoice.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="size-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            {invoice.status === "borrador" && (
                              <DropdownMenuItem>
                                <Send className="size-4 mr-2" />
                                Enviar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="size-4 mr-2" />
                              Descargar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
