"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  Sparkles,
  Download,
  ArrowUpDown,
  FileSpreadsheet,
  Edit2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface FacturaRecibida {
  id: string
  cliente: string
  tipo: string
  emisor: string
  total: string
  base: string
  tipoIVA: string
  cuotaIVA: string
  estado: string
  fecha: string
  confianza: number
}

const facturasRecibidas: FacturaRecibida[] = [
  {
    id: "FR-001",
    cliente: "María Castro",
    tipo: "Factura",
    emisor: "Amazon EU S.à r.l.",
    base: "120,00",
    tipoIVA: "21",
    cuotaIVA: "25,20",
    total: "145,20",
    estado: "leido",
    fecha: "15/03/2026",
    confianza: 98,
  },
  {
    id: "FR-002",
    cliente: "Tech Solutions SL",
    tipo: "Factura",
    emisor: "Proveedor X",
    base: "1.031,40",
    tipoIVA: "21",
    cuotaIVA: "216,60",
    total: "1.248,00",
    estado: "duda",
    fecha: "14/03/2026",
    confianza: 72,
  },
  {
    id: "FR-003",
    cliente: "Bar El Rincón",
    tipo: "Ticket",
    emisor: "Makro",
    base: "271,45",
    tipoIVA: "21",
    cuotaIVA: "57,00",
    total: "328,45",
    estado: "leido",
    fecha: "14/03/2026",
    confianza: 95,
  },
  {
    id: "FR-004",
    cliente: "Farmacia López",
    tipo: "Factura",
    emisor: "Laboratorios ABC",
    base: "2.388,43",
    tipoIVA: "21",
    cuotaIVA: "501,57",
    total: "2.890,00",
    estado: "duda",
    fecha: "13/03/2026",
    confianza: 68,
  },
  {
    id: "FR-005",
    cliente: "Carlos Ruiz",
    tipo: "Factura",
    emisor: "Office Depot",
    base: "74,37",
    tipoIVA: "21",
    cuotaIVA: "15,62",
    total: "89,99",
    estado: "leido",
    fecha: "12/03/2026",
    confianza: 99,
  },
]

const facturasEmitidas = [
  {
    id: "FE-001",
    cliente: "María Castro",
    destinatario: "Cliente Final A",
    base: "413,22",
    tipoIVA: "21",
    cuotaIVA: "86,78",
    total: "500,00",
    estado: "borrador",
    fecha: "15/03/2026",
  },
  {
    id: "FE-002",
    cliente: "Tech Solutions SL",
    destinatario: "Empresa XYZ",
    base: "2.644,63",
    tipoIVA: "21",
    cuotaIVA: "555,37",
    total: "3.200,00",
    estado: "enviada",
    fecha: "14/03/2026",
  },
  {
    id: "FE-003",
    cliente: "Diseños Aurora",
    destinatario: "Boutique Elegance",
    base: "619,83",
    tipoIVA: "21",
    cuotaIVA: "130,17",
    total: "750,00",
    estado: "borrador",
    fecha: "13/03/2026",
  },
]

export function ValidacionDocumental() {
  const [selectedDocument, setSelectedDocument] = useState<FacturaRecibida | null>(null)
  const [isValidationOpen, setIsValidationOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // Editable form state
  const [editedData, setEditedData] = useState({
    id: "",
    cliente: "",
    emisor: "",
    base: "",
    tipoIVA: "",
    cuotaIVA: "",
    total: "",
  })

  const handleOpenValidation = (doc: FacturaRecibida) => {
    setSelectedDocument(doc)
    setEditedData({
      id: doc.id,
      cliente: doc.cliente,
      emisor: doc.emisor,
      base: doc.base,
      tipoIVA: doc.tipoIVA,
      cuotaIVA: doc.cuotaIVA,
      total: doc.total,
    })
    setIsValidationOpen(true)
  }

  const handleValidate = () => {
    // Simulated validation - in real app would save to backend
    console.log("[v0] Validating document with data:", editedData)
    setIsValidationOpen(false)
    setSelectedDocument(null)
  }

  const handleExportExcel = (type: "recibidas" | "emitidas" | "ambas") => {
    // Simulated export - in real app would generate Excel file
    console.log("[v0] Exporting to A3 format:", type)
    setIsExportOpen(false)
  }

  const pendingValidation = facturasRecibidas.filter(f => f.estado === "duda").length
  const validated = facturasRecibidas.filter(f => f.estado === "leido").length

  // Calculate IVA when base changes
  const handleBaseChange = (value: string) => {
    const base = parseFloat(value.replace(",", ".")) || 0
    const tipoIVA = parseFloat(editedData.tipoIVA) || 21
    const cuotaIVA = (base * tipoIVA / 100).toFixed(2).replace(".", ",")
    const total = (base * (1 + tipoIVA / 100)).toFixed(2).replace(".", ",")
    setEditedData({ ...editedData, base: value, cuotaIVA, total })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Validación Documental</h2>
          <p className="text-muted-foreground mt-1">
            Supervisión de documentos procesados por IA con etiqueta de fiabilidad
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setIsExportOpen(true)}
        >
          <FileSpreadsheet className="size-4" />
          Exportar a Excel (A3)
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{facturasRecibidas.length}</p>
                <p className="text-sm text-muted-foreground">Documentos Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50">
                <CheckCircle className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{validated}</p>
                <p className="text-sm text-muted-foreground">Validados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50">
                <AlertCircle className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingValidation}</p>
                <p className="text-sm text-muted-foreground">Pendientes de Revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recibidas">
        <TabsList>
          <TabsTrigger value="recibidas" className="gap-2">
            <Download className="size-4" />
            Facturas Recibidas
          </TabsTrigger>
          <TabsTrigger value="emitidas" className="gap-2">
            <ArrowUpDown className="size-4" />
            Facturas Emitidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recibidas" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Facturas Recibidas</CardTitle>
              <CardDescription>
                Documentos procesados por IA pendientes de validación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Emisor</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fiabilidad IA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasRecibidas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-sm">{factura.id}</TableCell>
                      <TableCell className="font-medium">{factura.cliente}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{factura.emisor}</TableCell>
                      <TableCell>{factura.base} €</TableCell>
                      <TableCell>{factura.cuotaIVA} €</TableCell>
                      <TableCell className="font-medium">{factura.total} €</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            factura.confianza >= 90
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : factura.confianza >= 75
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          <Sparkles className="size-3 mr-1" />
                          {factura.confianza}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenValidation(factura)}
                          >
                            <Eye className="size-3.5 mr-1.5" />
                            Validar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emitidas" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Facturas Emitidas</CardTitle>
              <CardDescription>
                Borradores y facturas enviadas por tus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Base</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturasEmitidas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-sm">{factura.id}</TableCell>
                      <TableCell className="font-medium">{factura.cliente}</TableCell>
                      <TableCell>{factura.destinatario}</TableCell>
                      <TableCell>{factura.base} €</TableCell>
                      <TableCell>{factura.cuotaIVA} €</TableCell>
                      <TableCell className="font-medium">{factura.total} €</TableCell>
                      <TableCell>
                        {factura.estado === "borrador" ? (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Borrador
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                            Enviada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{factura.fecha}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Validation Dialog - Double Column View */}
      <Dialog open={isValidationOpen} onOpenChange={setIsValidationOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5" />
              Vista de Validación
            </DialogTitle>
            <DialogDescription>
              Compara el documento original con los datos extraídos. Los campos son editables.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="grid grid-cols-2 gap-6 mt-4">
              {/* Left Column - Document Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-foreground">Documento Original</h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      selectedDocument.confianza >= 90
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedDocument.confianza >= 75
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    <Sparkles className="size-3 mr-1" />
                    Fiabilidad: {selectedDocument.confianza}%
                  </Badge>
                </div>
                <div className="aspect-[3/4] bg-muted rounded-lg border border-border flex items-center justify-center relative overflow-hidden">
                  {/* Simulated document preview */}
                  <div className="absolute inset-0 bg-white p-6">
                    <div className="border-b-2 border-primary/20 pb-4 mb-4">
                      <div className="text-lg font-bold text-primary">{selectedDocument.emisor}</div>
                      <div className="text-sm text-muted-foreground mt-1">CIF: B12345678</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">N° Factura:</span>
                        <span className="font-mono">{selectedDocument.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span>{selectedDocument.fecha}</span>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{selectedDocument.cliente}</span>
                      </div>
                      <Separator className="my-3" />
                      <div className="space-y-1">
                        <div className="text-muted-foreground text-xs">Concepto</div>
                        <div className="bg-muted/50 p-2 rounded text-xs">
                          Servicios profesionales / Compra de material
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Imponible:</span>
                        <span>{selectedDocument.base} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA ({selectedDocument.tipoIVA}%):</span>
                        <span>{selectedDocument.cuotaIVA} €</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>TOTAL:</span>
                        <span className="text-primary">{selectedDocument.total} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Editable Form */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Datos Extraídos (Editables)</h4>
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-id">ID Documento</Label>
                      <Input
                        id="edit-id"
                        value={editedData.id}
                        onChange={(e) => setEditedData({ ...editedData, id: e.target.value })}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cliente">Cliente</Label>
                      <Input
                        id="edit-cliente"
                        value={editedData.cliente}
                        onChange={(e) => setEditedData({ ...editedData, cliente: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-emisor">Emisor</Label>
                    <Input
                      id="edit-emisor"
                      value={editedData.emisor}
                      onChange={(e) => setEditedData({ ...editedData, emisor: e.target.value })}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-base">Base Imponible (€)</Label>
                      <Input
                        id="edit-base"
                        value={editedData.base}
                        onChange={(e) => handleBaseChange(e.target.value)}
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-tipoiva">% IVA</Label>
                      <Select
                        value={editedData.tipoIVA}
                        onValueChange={(value: string) => {
                          const base = parseFloat(editedData.base.replace(",", ".")) || 0
                          const tipoIVA = parseFloat(value)
                          const cuotaIVA = (base * tipoIVA / 100).toFixed(2).replace(".", ",")
                          const total = (base * (1 + tipoIVA / 100)).toFixed(2).replace(".", ",")
                          setEditedData({ ...editedData, tipoIVA: value, cuotaIVA, total })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="21">21% (General)</SelectItem>
                          <SelectItem value="10">10% (Reducido)</SelectItem>
                          <SelectItem value="4">4% (Superreducido)</SelectItem>
                          <SelectItem value="0">0% (Exento)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-cuotaiva">Cuota IVA (€)</Label>
                      <Input
                        id="edit-cuotaiva"
                        value={editedData.cuotaIVA}
                        onChange={(e) => setEditedData({ ...editedData, cuotaIVA: e.target.value })}
                        className="text-right bg-muted/50"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-total">Total (€)</Label>
                      <Input
                        id="edit-total"
                        value={editedData.total}
                        onChange={(e) => setEditedData({ ...editedData, total: e.target.value })}
                        className="text-right font-bold text-lg bg-muted/50"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleValidate}
                  >
                    <Check className="size-4 mr-2" />
                    Validar Datos
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsValidationOpen(false)}
                  >
                    <X className="size-4 mr-2" />
                    Cancelar
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Una vez validado, el documento se guardará en el perfil del cliente.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              Exportar a Excel (Formato A3)
            </DialogTitle>
            <DialogDescription>
              Selecciona qué facturas deseas exportar en formato compatible con A3.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => handleExportExcel("recibidas")}
            >
              <Download className="size-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Facturas Recibidas</p>
                <p className="text-xs text-muted-foreground">{facturasRecibidas.length} documentos</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => handleExportExcel("emitidas")}
            >
              <ArrowUpDown className="size-5 text-accent" />
              <div className="text-left">
                <p className="font-medium">Facturas Emitidas</p>
                <p className="text-xs text-muted-foreground">{facturasEmitidas.length} documentos</p>
              </div>
            </Button>
            <Button
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => handleExportExcel("ambas")}
            >
              <FileSpreadsheet className="size-5" />
              <div className="text-left">
                <p className="font-medium">Exportar Ambas</p>
                <p className="text-xs text-muted-foreground/80">
                  {facturasRecibidas.length + facturasEmitidas.length} documentos en total
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
