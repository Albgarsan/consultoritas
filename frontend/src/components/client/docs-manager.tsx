"use client"

import { useState } from "react"
import { Search, Receipt, FileText, FileSpreadsheet, Download, Eye, ExternalLink, Upload, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DocumentFilter } from "@/components/shared/document-filter"
import { toast } from "sonner"
import { apiFetch, parseBackendError } from "@/lib/api"

const typeIcons: Record<string, any> = { factura: Receipt, nomina: FileSpreadsheet, impuesto: FileText, contrato: FileText, default: FileText }

const statusMap: Record<string, { label: string; className: string }> = {
  "en cola": { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  en_cola: { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  procesado: { label: "Procesado", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  error: { label: "Error OCR", className: "bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium" },
}

export function DocumentosView({ documents = [], businessId }: { documents?: any[]; businessId?: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [filters, setFilters] = useState<{
    status?: string
    dateFromMillis?: number
    dateToMillis?: number
    preset?: "last90" | "semester" | "custom"
  }>({})

  const activeDocuments = documents.length > 0 ? documents : []

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Selecciona un archivo para continuar")
      return
    }

    if (!businessId) {
      toast.error("No se ha identificado la empresa activa")
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("business_id", businessId)

      const response = await apiFetch("/api/documents/upload/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo procesar el documento")
      }

      setUploadFile(null)
      window.dispatchEvent(new Event("consultoritas:balance-updated"))
      window.dispatchEvent(new Event("consultoritas:refresh"))
      toast.success("Documento procesado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudo subir el documento")
    } finally {
      setIsUploading(false)
    }
  }

  const filteredDocs = activeDocuments.filter(doc => {
    // Search filter
    if (searchQuery && !(doc.file_name || "").toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Status filter
    if (filters.status) {
      if (doc.status !== filters.status) {
        return false
      }
    }

    // Date range filter
    if (filters.dateFromMillis || filters.dateToMillis) {
      const uploadedAt = new Date(doc.uploaded_at || "").getTime()
      if (filters.dateFromMillis && uploadedAt < filters.dateFromMillis) {
        return false
      }
      if (filters.dateToMillis && uploadedAt > filters.dateToMillis) {
        return false
      }
    }

    return true
  })

  const openDocumentPreview = async (doc: any) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download/?preview=true`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        setPreviewUrl(url)
        setPreviewName(doc.file_name || "documento")
        setPreviewOpen(true)
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(`Archivo no disponible: ${errorData.detail || "No se encontró el archivo"}`)
      } else {
        toast.error("Error al abrir la vista previa")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al abrir la vista previa")
    }
  }

  const openDocumentInNewTab = async (doc: any) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download/?preview=true`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener,noreferrer")
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(`Archivo no disponible: ${errorData.detail || "No se encontró el archivo"}`)
      } else {
        toast.error("Error al abrir el documento")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al abrir el documento")
    }
  }

  const downloadDocument = async (doc: any) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}/download/`, {
        method: "GET",
        credentials: "include",
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = doc.file_name || "documento"
        link.click()
        window.URL.revokeObjectURL(url)
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(`Archivo no disponible: ${errorData.detail || "No se encontró el archivo"}`)
      } else {
        toast.error("Error al descargar el documento")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al descargar el documento")
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Centro Documental</h2>
        <p className="text-muted-foreground">Gestiona tus papeles con la ayuda de la IA.</p>
      </div>

      <Card className="rounded-[2rem] border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(23,61,119,0.24)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base font-semibold">Subir factura OCR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="ocr-upload-file">
              Archivo
            </label>
            <Input
              id="ocr-upload-file"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="border-slate-200 bg-slate-50"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !uploadFile || !businessId}
            className="gap-2 bg-[#0a1128] text-white hover:bg-[#12244a]"
          >
            {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Procesar OCR
          </Button>
        </CardContent>
      </Card>

      <DocumentFilter onFilterChange={setFilters} />

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
            {filteredDocs.length > 0 ? filteredDocs.map((doc) => {
              const Icon = typeIcons[(doc.doc_type || "default").toLowerCase()] || typeIcons.default
              return (
                <TableRow key={doc.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg"><Icon className="size-4" /></div>
                      <div>
                         <p className="font-medium text-sm">{doc.file_name}</p>
                         <p className="text-xs text-muted-foreground">{doc.doc_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant="outline" className={statusMap[(doc.status || "").toLowerCase()]?.className || "bg-gray-100"}>
                        {statusMap[(doc.status || "").toLowerCase()]?.label || doc.status || "Desconocido"}
                      </Badge>
                      {(doc.status || "").toLowerCase() === "error" && (
                        <Alert variant="destructive" className="py-2">
                          <AlertDescription className="text-xs leading-5">
                            ❌ Error en el procesamiento automático: No hemos podido extraer los datos de este documento. Por favor, asegúrate de que el archivo no esté protegido con contraseña, que el formato sea un PDF/imagen válido y vuelve a subirlo. Si el error persiste, contacta con tu asesor.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openDocumentPreview(doc)} className="gap-1">
                      <Eye className="size-4" />
                      <span className="hidden sm:inline">Ver</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDocumentInNewTab(doc)} title="Abrir en pestaña nueva">
                      <ExternalLink className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadDocument(doc)} className="gap-1">
                      <Download className="size-4" />
                      <span className="hidden sm:inline">Descargar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  No hay documentos subidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open && previewUrl) {
            window.URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
          }
        }}
      >
        <DialogContent className="max-w-[98vw] w-full h-[95vh] overflow-hidden p-4 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Vista previa de {previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewUrl ? (
              <iframe src={previewUrl} title={previewName} className="h-full w-full rounded-lg border bg-white" />
            ) : (
              <div className="h-full rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
                Cargando vista previa...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
