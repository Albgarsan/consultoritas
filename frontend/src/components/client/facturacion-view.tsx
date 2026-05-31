"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  Eye,
  Download,
  Send,
  MoreHorizontal,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentFilter } from "@/components/shared/document-filter"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { apiFetch, parseBackendError, type DocumentoFacturacion } from "@/lib/api"
import { handleNumericKeyDown } from "@/lib/utils"

type BillingDocument = DocumentoFacturacion & {
  amount?: number
  number?: string
  date?: string
}

type DocumentFilters = {
  status?: string
  dateFromMillis?: number
  dateToMillis?: number
  preset?: "last90" | "semester" | "custom"
}

type PaginatedDocumentsResponse = {
  count?: number
  next?: string | null
  previous?: string | null
  results?: BillingDocument[]
  data?: BillingDocument[]
}

type PageState = {
  count: number
  next: string | null
  previous: string | null
  page: number
}

type InvoiceType = "Factura" | "Ingreso"

const statusMap: Record<string, { label: string; className: string }> = {
  "en cola": { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  en_cola: { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  procesado: { label: "Procesado", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  error: { label: "Error OCR", className: "bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium" },
}

function toDateLabel(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-ES")
}

function resolveAmount(doc: BillingDocument) {
  const invoiceTotal = Number(doc.invoice_data?.total_amount)
  if (Number.isFinite(invoiceTotal) && invoiceTotal > 0) return invoiceTotal
  const legacyTotal = Number(doc.invoice_data?.total_amount)
  if (Number.isFinite(legacyTotal) && legacyTotal > 0) return legacyTotal
  const docAmount = Number(doc.amount)
  return Number.isFinite(docAmount) ? docAmount : 0
}

function resolveDateMillis(doc: BillingDocument) {
  const source = doc.invoice_data?.issue_date || doc.invoice_data?.issue_date || doc.uploaded_at || doc.date
  const millis = new Date(source || 0).getTime()
  return Number.isFinite(millis) ? millis : 0
}

function resolveDateRangeLabel(filters: DocumentFilters) {
  if (filters.dateFromMillis || filters.dateToMillis) {
    const from = filters.dateFromMillis ? new Date(filters.dateFromMillis).toLocaleDateString("es-ES") : "inicio"
    const to = filters.dateToMillis ? new Date(filters.dateToMillis).toLocaleDateString("es-ES") : "hoy"
    return `${from} - ${to}`
  }
  if (filters.preset === "last90") return "Últimos 90 días"
  if (filters.preset === "semester") return "Último semestre"
  return "Periodo visible"
}

export function FacturacionView({ documents = [], businessId }: { documents?: BillingDocument[]; businessId?: string }) {
  const [docs, setDocs] = useState<BillingDocument[]>(documents)
  const [pageState, setPageState] = useState<PageState>({
    count: 0,
    next: null,
    previous: null,
    page: 1,
  })
  const pageRef = useRef(1)
  const [activeTab, setActiveTab] = useState("recibidas")
  const [docFilters, setDocFilters] = useState<DocumentFilters>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState("")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [createType, setCreateType] = useState<InvoiceType>("Factura")

  const facturasRecibidas = useMemo(
    () => docs.filter((d) => {
      const type = (d.doc_type || "").toLowerCase()
      return type === "factura" || type === "gasto"
    }),
    [docs],
  )

  const facturasEmitidas = useMemo(
    () => docs.filter((d) => (d.doc_type || "").toLowerCase() === "ingreso"),
    [docs],
  )

  const filteredRecibidas = useMemo(() => {
    let result = facturasRecibidas
    if (docFilters.status) {
      result = result.filter((doc) => doc.status === docFilters.status)
    }
    if (docFilters.dateFromMillis) {
      result = result.filter((doc) => resolveDateMillis(doc) >= docFilters.dateFromMillis!)
    }
    if (docFilters.dateToMillis) {
      result = result.filter((doc) => resolveDateMillis(doc) <= docFilters.dateToMillis!)
    }
    return result
  }, [facturasRecibidas, docFilters])

  const filteredEmitidas = useMemo(() => {
    let result = facturasEmitidas
    if (docFilters.status) {
      result = result.filter((doc) => doc.status === docFilters.status)
    }
    if (docFilters.dateFromMillis) {
      result = result.filter((doc) => resolveDateMillis(doc) >= docFilters.dateFromMillis!)
    }
    if (docFilters.dateToMillis) {
      result = result.filter((doc) => resolveDateMillis(doc) <= docFilters.dateToMillis!)
    }
    return result
  }, [facturasEmitidas, docFilters])

  const totalIngresos = filteredEmitidas.reduce((acc, doc) => acc + resolveAmount(doc), 0)
  const totalGastos = filteredRecibidas.reduce((acc, doc) => acc + resolveAmount(doc), 0)
  const periodLabel = resolveDateRangeLabel(docFilters)

  const fetchDocumentBlob = async (doc: BillingDocument, preview = true) => {
    const response = await apiFetch(`/api/documents/${doc.id}/download/?preview=${preview ? "true" : "false"}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || "No se pudo procesar el documento")
    }
    return response.blob()
  }

  const openDocumentPreview = async (doc: BillingDocument) => {
    setActionLoadingId(doc.id)
    try {
      const blob = await fetchDocumentBlob(doc, true)
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewName(doc.file_name || doc.number || "Documento")
      setPreviewOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "Error al abrir la vista previa")
    } finally {
      setActionLoadingId(null)
    }
  }

  const openDocumentInNewTab = async (doc: BillingDocument) => {
    setActionLoadingId(doc.id)
    try {
      const blob = await fetchDocumentBlob(doc, true)
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "Error al abrir en pestaña nueva")
    } finally {
      setActionLoadingId(null)
    }
  }

  const downloadDocument = async (doc: BillingDocument) => {
    setActionLoadingId(doc.id)
    try {
      const blob = await fetchDocumentBlob(doc, false)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = doc.file_name || "factura"
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "Error al descargar la factura")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteDocument = async (doc: BillingDocument) => {
    if (!window.confirm("¿Eliminar este documento? Esta acción es irreversible.")) return
    setActionLoadingId(doc.id)
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || "No se pudo eliminar el documento")
      }
      toast.success("Documento eliminado")
      try { window.dispatchEvent(new Event("consultoritas:refresh")) } catch {}
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudo eliminar el documento")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCreateInvoice = async () => {
    if (!createFile) {
      toast.error("Selecciona un archivo para continuar")
      return
    }

    if (!businessId) {
      toast.error("No se ha identificado la empresa activa")
      return
    }

    setIsCreating(true)
    try {
      const formData = new FormData()
      formData.append("file", createFile)
      formData.append("business_id", businessId)
      formData.append("doc_type", createType)

      const response = await apiFetch("/api/documents/upload/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo subir la factura")
      }

      toast.success("Factura subida correctamente")
      setCreateOpen(false)
      setCreateFile(null)
      window.dispatchEvent(new Event("consultoritas:balance-updated"))
      window.dispatchEvent(new Event("consultoritas:refresh"))
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudo subir la factura")
    } finally {
      setIsCreating(false)
    }
  }

  const fetchDocuments = async (page = 1) => {
    if (!businessId) {
      return
    }

    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("business_id", businessId)
      const res = await apiFetch(`/api/documents/?${params.toString()}`)
      if (!res.ok) return
      const data = (await res.json().catch(() => [])) as PaginatedDocumentsResponse | BillingDocument[]
      const parsed = Array.isArray(data) ? { results: data } : data
      const results = parsed.results || parsed.data || []
      pageRef.current = page
      setDocs(results)
      setPageState({
        count: Number(parsed.count || results.length || 0),
        next: parsed.next || null,
        previous: parsed.previous || null,
        page,
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!businessId) {
      setDocs([])
      setPageState({ count: 0, next: null, previous: null, page: 1 })
      return
    }

    const refresh = () => { fetchDocuments(pageRef.current).catch(() => {}) }
    window.addEventListener("consultoritas:refresh", refresh)
    // initial load
    fetchDocuments(1).catch(() => {})
    return () => {
      window.removeEventListener("consultoritas:refresh", refresh)
    }
  }, [businessId])

  const totalPages = Math.max(1, Math.ceil((pageState.count || docs.length || 0) / 20))
  const goToPreviousPage = () => {
    if (pageState.previous && pageState.page > 1) {
      fetchDocuments(pageState.page - 1).catch(() => {})
    }
  }

  const goToNextPage = () => {
    if (pageState.next) {
      fetchDocuments(pageState.page + 1).catch(() => {})
    }
  }

  const renderRows = (rows: BillingDocument[], emptyLabel: string) => {
    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
            {emptyLabel}
          </TableCell>
        </TableRow>
      )
    }

    return rows.map((invoice) => {
      const status = statusMap[(invoice.status || "").toLowerCase()] || { label: invoice.status || "Desconocido", className: "bg-gray-100" }
      const isBusy = actionLoadingId === invoice.id

      return (
        <TableRow key={invoice.id}>
          <TableCell className="pl-6 font-medium">{invoice.number || invoice.file_name}</TableCell>
          <TableCell className="text-muted-foreground">
            {toDateLabel(invoice.invoice_data?.issue_date || invoice.uploaded_at || invoice.date)}
          </TableCell>
          <TableCell>
            <Badge className={status.className}>{status.label}</Badge>
          </TableCell>
          <TableCell className="font-medium">
            {resolveAmount(invoice).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
          </TableCell>
          <TableCell className="pr-6 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" disabled={isBusy}>
                  {isBusy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDocumentPreview(invoice)}>
                  <Eye className="size-4 mr-2" />
                  Vista previa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDocumentInNewTab(invoice)}>
                  <ExternalLink className="size-4 mr-2" />
                  Abrir en pestaña nueva
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteDocument(invoice)} className="text-destructive">
                  <Trash2 className="size-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadDocument(invoice)}>
                  <Download className="size-4 mr-2" />
                  Descargar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      )
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Resumen de Facturación</h2>
          <p className="text-muted-foreground">Gestiona tus facturas emitidas y recibidas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2 bg-[#0a1128] text-white hover:bg-[#12244a]" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Subir factura
          </Button>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Ingresos ({periodLabel})</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalIngresos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="size-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Gastos ({periodLabel})</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalGastos.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="size-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DocumentFilter onFilterChange={setDocFilters} />

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
                    <TableHead className="pl-6">Nº Factura / Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filteredRecibidas, "No hay facturas recibidas.")}</TableBody>
              </Table>
              <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Página {pageState.page} de {totalPages} · {pageState.count} facturas
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={goToPreviousPage} disabled={!pageState.previous}>
                    Anterior
                  </Button>
                  <Button onClick={goToNextPage} disabled={!pageState.next}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="emitidas" className="m-0">
            <CardContent className="p-0 pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Nº Factura / Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderRows(filteredEmitidas, "No hay facturas emitidas.")}</TableBody>
              </Table>
              <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Página {pageState.page} de {totalPages} · {pageState.count} facturas
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={goToPreviousPage} disabled={!pageState.previous}>
                    Anterior
                  </Button>
                  <Button onClick={goToNextPage} disabled={!pageState.next}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subir nueva factura</DialogTitle>
            <DialogDescription>
              Selecciona si la factura es recibida o emitida y súbela para procesarla en facturación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-file">Archivo</Label>
              <Input id="create-file" type="file" accept=".pdf,image/*" onKeyDown={handleNumericKeyDown} onChange={(e) => setCreateFile(e.target.files?.[0] || null)} />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={createType} onValueChange={(value) => setCreateType(value as InvoiceType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Factura">Factura recibida</SelectItem>
                  <SelectItem value="Ingreso">Factura emitida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={isCreating} className="gap-2 bg-[#0a1128] text-white hover:bg-[#12244a]">
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Subir factura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
