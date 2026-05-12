"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  MoreHorizontal,
  FileUp,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { apiFetch } from "@/lib/api"
import { DocumentFilter } from "@/components/shared/document-filter"
import { toast } from "sonner"

const EXCEL_HEADER_FILL = "1E3A8A"
const EXCEL_ZEBRA_FILL = "F8FAFC"

type StatusVisual = { label: string; className: string }

type UploadedBy = {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
}

type ClientOption = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
}

type InvoiceLikeData = {
  issue_date?: string
  fecha_operacion?: string
  serie?: string
  invoice_number?: string
  invoice_number_final?: string
  nif_tipo?: string
  nif_codigo_pais?: string
  nif_identificacion?: string
  supplier_tax_id?: string
  total_amount?: number
  tax_base?: number
  tax_rate?: number
  tax_amount?: number
  tipo_recargo_equivalencia?: number
  cuota_recargo_equivalencia?: number
}

type BillingDocument = {
  id: string
  number?: string
  file_name?: string
  doc_type?: string
  status?: string
  amount?: number
  uploaded_at?: string
  date?: string
  business_name?: string
  business?: string
  client_name?: string
  uploaded_by?: UploadedBy
  invoice_data?: InvoiceLikeData
}

type DocumentFilters = {
  status?: string
  dateFromMillis?: number
  dateToMillis?: number
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

const statusConfig: Record<string, StatusVisual> = {
  pendiente: { label: "Pendiente", className: "bg-amber-500/10 text-amber-600 border-0" },
  procesado: { label: "Procesado", className: "bg-emerald-500/10 text-emerald-600 border-0" },
  error: { label: "Error", className: "bg-rose-500/10 text-rose-600 border-0" },
  pagada: { label: "Pagada", className: "bg-emerald-500/10 text-emerald-600 border-0" },
  borrador: { label: "Borrador", className: "bg-muted text-muted-foreground border-0" },
  enviada: { label: "Enviada", className: "bg-primary/10 text-primary border-0" },
  default: { label: "Desconocido", className: "bg-muted text-muted-foreground border-0" },
}

function resolveClientId(doc: BillingDocument) {
  return doc.uploaded_by?.id || ""
}

function resolveClientName(doc: BillingDocument) {
  const uploadedBy = doc.uploaded_by
  if (uploadedBy) {
    return [uploadedBy.first_name, uploadedBy.last_name].filter(Boolean).join(" ") || uploadedBy.email || "Cliente"
  }
  return doc.client_name || doc.business_name || "Cliente"
}

function toNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toDateCellValue(value: unknown) {
  if (!value) return null
  if (!(value instanceof Date || typeof value === "string" || typeof value === "number")) {
    return null
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toLocaleDate(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString()
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
  const [clientFilter, setClientFilter] = useState("all")
  const [docFilters, setDocFilters] = useState<DocumentFilters>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createFile, setCreateFile] = useState<File | null>(null)
  const [createType, setCreateType] = useState<"Factura" | "Ingreso">("Factura")
  const [createClientId, setCreateClientId] = useState("")
  const [exportClientId, setExportClientId] = useState("")
  const [clients, setClients] = useState<ClientOption[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const response = await apiFetch(`/api/users/clients/`)
        if (!response.ok) {
          setClients([])
          return
        }
        const data = await response.json().catch(() => [])
        if (!active) return

        const parsed = Array.isArray(data) ? data : (data && (data.results || data.data) ? (data.results || data.data) : [])
        setClients(parsed)
        if (parsed.length > 0) {
          const firstId = String(parsed[0].id)
          setCreateClientId((prev) => prev || firstId)
          setExportClientId((prev) => prev || firstId)
        }
      } catch {
        setClients([])
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      const allResults: BillingDocument[] = []
      let nextUrl: string | null = `/api/documents/?page=1`
      let count = 0

      if (businessId) {
        const params = new URLSearchParams()
        params.set("business_id", businessId)
        nextUrl = `/api/documents/?${params.toString()}&page=1`
      }

      // Fetch all pages until exhausted
      while (nextUrl) {
        const res = await apiFetch(nextUrl)
        if (!res.ok) break
        const data = (await res.json().catch(() => null))
        if (!data) break

        const parsed = Array.isArray(data) ? { results: data, next: null } : data
        const results = parsed.results || parsed.data || []
        allResults.push(...results)
        count = parsed.count || allResults.length
        nextUrl = parsed.next || null
      }

      pageRef.current = page
      setDocs(allResults)
      setPageState({
        count: Number(count || allResults.length || 0),
        next: null,
        previous: null,
        page: 1,
      })
    } catch {
      // ignore
    }
  }, [businessId])

  useEffect(() => {
    const refresh = () => {
      fetchDocuments(pageRef.current).catch(() => {})
    }
    window.addEventListener("consultoritas:refresh", refresh)
    // Trigger initial load and cleanup
    fetchDocuments(1).catch(() => {})
    return () => {
      window.removeEventListener("consultoritas:refresh", refresh)
    }
  }, [fetchDocuments])

  const facturasRecibidas = docs.filter((d) => {
    const type = d.doc_type?.toLowerCase()
    return type === "factura" || type === "gasto"
  })
  const facturasEmitidas = docs.filter((d) => d.doc_type?.toLowerCase() === "ingreso")

  const uniqueClients = useMemo(() => {
    const names = new Set<string>()
    docs.forEach((doc) => names.add(resolveClientName(doc)))
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [docs])

  const filteredRecibidas = useMemo(() => {
    let list = clientFilter === "all" ? facturasRecibidas : facturasRecibidas.filter((doc) => resolveClientName(doc) === clientFilter)
    if (docFilters?.status) list = list.filter((d) => (d.status || "").toLowerCase() === docFilters.status?.toLowerCase())
    const dateFromMillis = docFilters?.dateFromMillis
    const dateToMillis = docFilters?.dateToMillis
    if (dateFromMillis) list = list.filter((d) => new Date(d.uploaded_at || d.date || 0).getTime() >= dateFromMillis)
    if (dateToMillis) list = list.filter((d) => new Date(d.uploaded_at || d.date || 0).getTime() <= dateToMillis)
    return list
  }, [facturasRecibidas, clientFilter, docFilters])

  const filteredEmitidas = useMemo(() => {
    let list = clientFilter === "all" ? facturasEmitidas : facturasEmitidas.filter((doc) => resolveClientName(doc) === clientFilter)
    if (docFilters?.status) list = list.filter((d) => (d.status || "").toLowerCase() === docFilters.status?.toLowerCase())
    const dateFromMillis = docFilters?.dateFromMillis
    const dateToMillis = docFilters?.dateToMillis
    if (dateFromMillis) list = list.filter((d) => new Date(d.uploaded_at || d.date || 0).getTime() >= dateFromMillis)
    if (dateToMillis) list = list.filter((d) => new Date(d.uploaded_at || d.date || 0).getTime() <= dateToMillis)
    return list
  }, [facturasEmitidas, clientFilter, docFilters])

  const openDocumentPreview = async (doc: BillingDocument) => {
    try {
      const response = await apiFetch(`/api/documents/${doc.id}/download/?preview=true`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo abrir la factura")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
      setPreviewName(doc.file_name || doc.number || "Factura")
      setPreviewOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la factura")
    }
  }

  const openDocumentInNewTab = async (doc: BillingDocument) => {
    try {
      const response = await apiFetch(`/api/documents/${doc.id}/download/?preview=true`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo abrir el documento")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        toast.error("No se pudo abrir el documento. Verifica que los popups estén permitidos.")
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el documento")
    }
  }

  const downloadDocument = async (doc: BillingDocument) => {
    try {
      const response = await apiFetch(`/api/documents/${doc.id}/download/`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo descargar la factura")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = doc.file_name || "factura"
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la factura")
    }
  }

  const handleDeleteDocument = async (doc: BillingDocument) => {
    if (!window.confirm("¿Eliminar este documento? Esta acción es irreversible.")) return
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || "No se pudo eliminar el documento")
      }
      toast.success("Documento eliminado")
      try { window.dispatchEvent(new Event("consultoritas:refresh")) } catch {}
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el documento")
    }
  }

  const handleExportLibroIVA = async () => {
    if (!exportClientId) {
      toast.error("Selecciona un cliente para exportar el libro IVA")
      return
    }

    const docsForExport = [...filteredRecibidas, ...filteredEmitidas].filter(
      (doc) => resolveClientId(doc) === exportClientId,
    )

    if (docsForExport.length === 0) {
      toast.error("No hay facturas para el cliente seleccionado con los filtros actuales")
      return
    }

    try {
      // @ts-ignore exceljs is loaded at runtime only
      const ExcelJsModule = await import("exceljs")
      const { Workbook } = ExcelJsModule
      const workbook = new Workbook()
      const selectedClient = clients.find((client) => String(client.id) === exportClientId)
      const clientName = [selectedClient?.first_name, selectedClient?.last_name].filter(Boolean).join(" ") || selectedClient?.email || "cliente"
      const companyName = clientName.toString().replace(/[\\/:*?\[\]]/g, "")
      const worksheet = workbook.addWorksheet(`Libro_IVA_${companyName}`.slice(0, 31))

      const headers = [
        "Fecha Expedición",
        "Fecha Operación",
        "Serie",
        "Número",
        "Número Final",
        "NIF Tipo",
        "NIF Código País",
        "NIF Identificación",
        "Total Factura",
        "Base Imponible",
        "Tipo IVA",
        "Cuota IVA Repercutida",
        "Tipo Recargo Equivalencia",
        "Cuota Recargo Equivalencia",
      ]

      worksheet.addRow(headers)
      worksheet.views = [{ state: "frozen", ySplit: 1 }]
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      }

      const rows = docsForExport.map((doc) => {
        const invoice = doc.invoice_data || {}
        return [
          toDateCellValue(invoice.issue_date || doc.uploaded_at),
          toDateCellValue(invoice.fecha_operacion || invoice.issue_date || doc.uploaded_at),
          invoice.serie || "",
          invoice.invoice_number || "",
          invoice.invoice_number_final || "",
          invoice.nif_tipo || "",
          invoice.nif_codigo_pais || "ES",
          invoice.nif_identificacion || invoice.supplier_tax_id || "",
          toNumber(invoice.total_amount ?? doc.amount),
          toNumber(invoice.tax_base ?? 0),
          toNumber(invoice.tax_rate ?? 0),
          toNumber(invoice.tax_amount),
          toNumber(invoice.tipo_recargo_equivalencia),
          toNumber(invoice.cuota_recargo_equivalencia),
        ]
      })

      rows.forEach((row) => worksheet.addRow(row))

      const headerRow = worksheet.getRow(1)
      headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true }
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: EXCEL_HEADER_FILL },
      }

      const firstDataRow = 2
      const lastDataRow = worksheet.rowCount

      for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex)
        if (rowIndex % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: EXCEL_ZEBRA_FILL },
          }
        }
      }

      for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
        const row = worksheet.getRow(rowIndex)
        row.getCell(1).numFmt = "dd/mm/yyyy"
        row.getCell(2).numFmt = "dd/mm/yyyy"
        ;[9, 10, 12, 14].forEach((col) => {
          row.getCell(col).numFmt = "#,##0.00 \"€\""
          row.getCell(col).alignment = { horizontal: "right" }
        })
        ;[11, 13].forEach((col) => {
          row.getCell(col).numFmt = "0.00"
          row.getCell(col).alignment = { horizontal: "right" }
        })
      }

      worksheet.columns.forEach((column: any) => {
        const maxLength = column.values?.reduce((acc: number, value: unknown) => {
          const current = value == null ? 0 : value instanceof Date ? 10 : String(value).length
          return Math.max(acc, current)
        }, 12) || 12
        column.width = Math.min(Math.max(maxLength + 2, 12), 42)
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `Libro_IVA_${companyName}_${new Date().toISOString().slice(0, 10)}.xlsx`
      anchor.click()
      window.URL.revokeObjectURL(url)
      setExportOpen(false)
      toast.success("Libro de IVA exportado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar el libro de IVA")
    }
  }

  const handleCreateInvoice = async () => {
    if (!createFile) {
      toast.error("Selecciona un archivo para continuar")
      return
    }

    if (!createClientId) {
      toast.error("Selecciona un cliente para asignar la factura")
      return
    }

    // Validar tamaño del archivo (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (createFile.size > maxSize) {
      toast.error(`El archivo es demasiado grande. Máximo permitido: 50MB. Tu archivo: ${(createFile.size / (1024 * 1024)).toFixed(2)}MB`)
      return
    }

    setIsCreating(true)
    try {
      const formData = new FormData()
      formData.append("file", createFile)
      formData.append("doc_type", createType)
      formData.append("status", "Pendiente")
      formData.append("assigned_user_id", createClientId)
      if (businessId) {
        formData.append("business_id", businessId)
      }

      const response = await apiFetch("/api/documents/", {
        method: "POST",
        body: formData,
      })

      if (response.status === 413) {
        throw new Error("El archivo excede el límite de tamaño del servidor (50MB máximo). Intenta con un archivo más pequeño.")
      }

      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "Formato de archivo no válido o datos incompletos")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo crear la factura")
      }

      toast.success("Factura creada correctamente")
      setCreateOpen(false)
      setCreateFile(null)
      window.dispatchEvent(new Event("consultoritas:refresh"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la factura")
    } finally {
      setIsCreating(false)
    }
  }

  const totalIngresos = filteredEmitidas
    .filter((f) => ["pagada", "procesado"].includes((f.status || "").toLowerCase()))
    .reduce((acc, f) => acc + (f.amount || 0), 0)

  const totalGastos = filteredRecibidas
    .filter((f) => ["pagada", "procesado"].includes((f.status || "").toLowerCase()))
    .reduce((acc, f) => acc + (f.amount || 0), 0)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Resumen de Facturación</h2>
          <p className="text-muted-foreground">Gestiona tus facturas emitidas y recibidas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
            <Download className="size-4" />
            Exportar Libro IVA
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Crear Nueva Factura
          </Button>
        </div>
      </div>

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
              <ArrowUpRight className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">N/A</span>
              <span className="text-muted-foreground">sin datos comparativos</span>
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
              <ArrowDownRight className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">N/A</span>
              <span className="text-muted-foreground">sin datos comparativos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-2">
        <DocumentFilter
          onFilterChange={setDocFilters}
          clientFilter={clientFilter}
          onClientFilterChange={setClientFilter}
          clientOptions={uniqueClients}
        />
      </div>

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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecibidas.length > 0 ? filteredRecibidas.map((invoice) => {
                    const statusName = invoice.status?.toLowerCase()
                    const status = statusConfig[statusName || "default"] || statusConfig.default

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="pl-6 font-medium">{invoice.number || invoice.file_name}</TableCell>
                        <TableCell>{resolveClientName(invoice)}</TableCell>
                        <TableCell className="text-muted-foreground">{toLocaleDate(invoice.uploaded_at || invoice.date)}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {(invoice.amount || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDocumentPreview(invoice)}>
                                <Eye className="size-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDocumentInNewTab(invoice)} title="Abrir en pestaña nueva">
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
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No hay facturas recibidas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmitidas.length > 0 ? filteredEmitidas.map((invoice) => {
                    const statusName = invoice.status?.toLowerCase()
                    const status = statusConfig[statusName || "default"] || statusConfig.default

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="pl-6 font-medium">{invoice.number || invoice.file_name}</TableCell>
                        <TableCell>{resolveClientName(invoice)}</TableCell>
                        <TableCell className="text-muted-foreground">{toLocaleDate(invoice.uploaded_at || invoice.date)}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {(invoice.amount || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDocumentPreview(invoice)}>
                                <Eye className="size-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDocumentInNewTab(invoice)} title="Abrir en pestaña nueva">
                                <ExternalLink className="size-4 mr-2" />
                                Abrir en pestaña nueva
                              </DropdownMenuItem>
                              {statusName === "borrador" && (
                                <DropdownMenuItem disabled>
                                  <Send className="size-4 mr-2" />
                                  Enviar (no implementado)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleDeleteDocument(invoice)} className="text-destructive">
                                <Trash2 className="size-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadDocument(invoice)}>
                                <Download className="size-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No hay facturas emitidas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="size-5" /> Crear nueva factura
            </DialogTitle>
            <DialogDescription>
              Sube un archivo para registrarlo como factura en el despacho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input type="file" accept=".pdf,image/*" onChange={(e) => setCreateFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={createType} onValueChange={(value) => setCreateType(value as "Factura" | "Ingreso")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Factura">Factura recibida</SelectItem>
                  <SelectItem value="Ingreso">Factura emitida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente asignado</Label>
              <Select value={createClientId} onValueChange={setCreateClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => {
                    const label = [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email || "Cliente"
                    return (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateInvoice} disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Crear factura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Libro IVA por cliente</DialogTitle>
            <DialogDescription>
              Selecciona un cliente para generar el libro con sus facturas filtradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={exportClientId} onValueChange={setExportClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => {
                    const label = [client.first_name, client.last_name].filter(Boolean).join(" ") || client.email || "Cliente"
                    return (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExportOpen(false)}>Cancelar</Button>
              <Button onClick={handleExportLibroIVA} className="gap-2">
                <Download className="size-4" />
                Exportar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <DialogDescription>Visualización del documento original antes de descargarlo.</DialogDescription>
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
