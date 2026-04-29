"use client"

import { useState } from "react"
import { Search, Filter, Receipt, FileText, FileSpreadsheet, Download, Eye, CheckCircle2, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DocumentUploader } from "./uploader"

interface Document {
  id: string; name: string; type: "factura" | "nomina" | "impuesto" | "contrato";
  date: string; status: "procesado" | "pendiente"; size: string;
}

const documents: Document[] = [
  { id: "1", name: "Factura_Amazon_Marzo.pdf", type: "factura", date: "12/03/2026", status: "procesado", size: "245 KB" },
  { id: "2", name: "Nomina_Febrero.pdf", type: "nomina", date: "28/02/2026", status: "procesado", size: "180 KB" },
  { id: "5", name: "Contrato_Alquiler_Local.pdf", type: "contrato", date: "01/03/2026", status: "pendiente", size: "512 KB" },
]

const typeIcons = { factura: Receipt, nomina: FileSpreadsheet, impuesto: FileText, contrato: FileText }

export function DocumentosView() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDocs = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Centro Documental</h2>
        <p className="text-muted-foreground">Gestiona tus papeles con la ayuda de la IA.</p>
      </div>

      <DocumentUploader />

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-base font-semibold">Documentos Recientes</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Nombre</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((doc) => {
              const Icon = typeIcons[doc.type]
              return (
                <TableRow key={doc.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg"><Icon className="size-4" /></div>
                      <div><p className="font-medium text-sm">{doc.name}</p><p className="text-xs text-muted-foreground">{doc.size}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{doc.date}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "procesado" ? "default" : "outline"} className={doc.status === "procesado" ? "bg-emerald-500/10 text-emerald-600 border-0" : ""}>
                      {doc.status === "procesado" ? "Procesado IA" : "Pendiente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon"><Eye className="size-4" /></Button>
                    <Button variant="ghost" size="icon"><Download className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
