"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
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
  Loader2,
  MoreHorizontal,
  Upload,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { apiFetch, parseBackendError, type DocumentoFacturacion, type InvoiceDataAEAT } from "@/lib/api"
import { cn, handleNumericKeyDown } from "@/lib/utils"
import { DocumentFilter } from "@/components/shared/document-filter"
import { useApiData } from "@/lib/use-api"

type DocumentoValidacion = DocumentoFacturacion & {
  amount?: number
  tax_rate?: number
  client_name?: string
  business_name?: string
  customer_name?: string
}

type ValidationRow = {
  id: string
  sourceType: "recibida" | "emitida"
  cliente: string
  contraparte: string
  estado: string
  fecha: string
  confianza: number
  doc: DocumentoValidacion
  invoiceData: InvoiceDataAEAT
}

type FilterState = {
  status?: string
  dateFromMillis?: number
  dateToMillis?: number
  preset?: "last90" | "semester" | "custom"
  client?: string
}

type EditableAEAT = {
  issue_date: string
  fecha_operacion: string
  serie: string
  invoice_number: string
  invoice_number_final: string
  nif_codigo_pais: string
  nif_identificacion: string
  clave_operacion: string
  total_amount: string
  tax_base: string
  tax_rate: string
  tax_amount: string
  tipo_recargo_equivalencia: string
  cuota_recargo_equivalencia: string
}

const EXCEL_HEADER_FILL = "1E3A8A"
const EXCEL_ZEBRA_FILL = "F8FAFC"
const ITEMS_PER_PAGE = 10

const statusMap: Record<string, { label: string; className: string }> = {
  "en cola": { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  en_cola: { label: "En cola", className: "bg-muted text-muted-foreground animate-pulse" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  procesado: { label: "Procesado", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  error: { label: "Error OCR", className: "bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium" },
}

const REQUIRED_OCR_FIELDS: Array<keyof InvoiceDataAEAT> = [
  "issue_date",
  "invoice_number",
  "nif_identificacion",
  "tax_base",
  "tax_rate",
  "tax_amount",
  "total_amount",
]

// Simple NIF validation: basic format check for Spanish NIF/CIF
function validateNIF(nif: string): { valid: boolean; message?: string } {
  if (!nif || !nif.trim()) return { valid: true }

  const normalized = nif.trim().toUpperCase()

  // Campo unificado: acepta NIF/NIE/CIF válido alfanumérico.
  const nifNieValid = /^[0-9]{8}[A-Z]$/.test(normalized) || /^[XYZ][0-9]{7}[A-Z]$/.test(normalized)
  const cifValid = /^[A-Z][0-9]{7}[A-Z0-9]$/.test(normalized)
  if (!nifNieValid && !cifValid) {
    return { valid: false, message: "Formato de identificación fiscal inválido (NIF/CIF/NIE)." }
  }

  return { valid: true }
}

function safeNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseNullableNumber(value: string) {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function toDateInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10)
}

function computeConfidence(invoiceData?: InvoiceDataAEAT | null) {
  if (!invoiceData) return 20
  const total = REQUIRED_OCR_FIELDS.length
  const filled = REQUIRED_OCR_FIELDS.filter((key) => {
    const value = invoiceData[key]
    return value !== null && value !== undefined && String(value).trim() !== ""
  }).length
  if (filled === 0) return 20
  return Math.min(95, Math.round(30 + (filled / total) * 65))
}

function resolveStatusLabel(status?: string) {
  return statusMap[(status || "").toLowerCase()]?.label || (status || "Desconocido")
}

function toDateMillis(doc: DocumentoValidacion) {
  const source = doc.invoice_data?.issue_date || doc.invoice_data?.issue_date || doc.uploaded_at
  const millis = new Date(source || 0).getTime()
  return Number.isFinite(millis) ? millis : 0
}

function toLocaleDate(doc: DocumentoValidacion) {
  const source = doc.invoice_data?.issue_date || doc.invoice_data?.issue_date || doc.uploaded_at
  const date = new Date(source || 0)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-ES")
}

function rowToEditable(row: ValidationRow): EditableAEAT {
  const invoice = row.invoiceData || {}

  let taxRateStr = "21"
  if (invoice.tax_rate !== undefined && invoice.tax_rate !== null) {
      taxRateStr = Number.isInteger(Number(invoice.tax_rate))
          ? String(Math.round(Number(invoice.tax_rate)))
          : String(invoice.tax_rate)
  }

  return {
    issue_date: toDateInputValue(invoice.issue_date || invoice.issue_date),
    fecha_operacion: toDateInputValue(invoice.fecha_operacion || invoice.issue_date),
    serie: invoice.serie || "",
    invoice_number: invoice.invoice_number || "",
    invoice_number_final: invoice.invoice_number_final || "",
    nif_codigo_pais: invoice.nif_codigo_pais || "ES",
    nif_identificacion: invoice.nif_identificacion || invoice.supplier_tax_id || "",
    clave_operacion: invoice.clave_operacion || "01",
    total_amount: String(invoice.total_amount ?? invoice.total_amount ?? row.doc.amount ?? ""),
    tax_base: String(invoice.tax_base ?? invoice.tax_base ?? ""),
    tax_rate: taxRateStr, // <--- Aquí inyectamos la variable arreglada
    tax_amount: String(invoice.tax_amount ?? ""),
    tipo_recargo_equivalencia: String(invoice.tipo_recargo_equivalencia ?? ""),
    cuota_recargo_equivalencia: String(invoice.cuota_recargo_equivalencia ?? ""),
  }
}

function clientLabel(doc: DocumentoValidacion) {
  if (doc.uploaded_by) {
    const name = [doc.uploaded_by.first_name, doc.uploaded_by.last_name].filter(Boolean).join(" ")
    if (name) return name
    if (doc.uploaded_by.email) return doc.uploaded_by.email
  }
  return doc.client_name || doc.business_name || "Cliente"
}

function counterpartyLabel(doc: DocumentoValidacion) {
  return (
    doc.invoice_data?.supplier_name ||
    doc.file_name ||
    doc.customer_name ||
    "Sin contraparte"
  )
}

function getStatusPriority(status?: string) {
  const current = (status || "").toLowerCase()
  if (current === "en cola" || current === "en_cola" || current === "pendiente") return 0
  if (current === "procesado") return 1
  return 2
}

function getUploadedAtMillis(doc: DocumentoValidacion) {
  const source = doc.uploaded_at || doc.invoice_data?.issue_date || 0
  const millis = new Date(source).getTime()
  return Number.isFinite(millis) ? millis : 0
}

export function ValidacionDocumental({ documents = [] }: { documents?: DocumentoValidacion[] }) {
  const [filters, setFilters] = useState<FilterState>({})
  const [activeTab, setActiveTab] = useState("recibidas")
  const [currentPage, setCurrentPage] = useState(1)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [showExportWarning, setShowExportWarning] = useState(false)
  const [pendingExportType, setPendingExportType] = useState<"recibidas" | "emitidas" | "ambas" | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusinessId, setUploadBusinessId] = useState("__none")
  const [uploadDocType, setUploadDocType] = useState("__none")
  const [isUploading, setIsUploading] = useState(false)

  const { data: apiDocs = [], mutate: mutateDocs } = useApiData<DocumentoValidacion[]>("/api/documents/", {
    dedupingInterval: 5000
  })
  const { data: businessOptions = [] } = useApiData<Array<{ id?: string; name?: string; business_name?: string }>>("/api/business/companies/", {
    dedupingInterval: 30_000,
  })

  const initialDocs = documents.length > 0 ? documents : apiDocs

  useEffect(() => {
    const handleRefresh = () => {
      void mutateDocs()
    }
    window.addEventListener("consultoritas:refresh", handleRefresh)
    window.addEventListener("consultoritas:documents-updated", handleRefresh)
    return () => {
      window.removeEventListener("consultoritas:refresh", handleRefresh)
      window.removeEventListener("consultoritas:documents-updated", handleRefresh)
    }
  }, [mutateDocs])

  const [selectedRow, setSelectedRow] = useState<ValidationRow | null>(null)
  const [isValidationOpen, setIsValidationOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [editedData, setEditedData] = useState<EditableAEAT>({
    issue_date: "",
    fecha_operacion: "",
    serie: "",
    invoice_number: "",
    invoice_number_final: "",
    nif_codigo_pais: "ES",
    nif_identificacion: "",
    clave_operacion: "01",
    total_amount: "",
    tax_base: "",
    tax_rate: "21",
    tax_amount: "",
    tipo_recargo_equivalencia: "",
    cuota_recargo_equivalencia: "",
  })
  const nifValidation = useMemo(
    () => validateNIF(editedData.nif_identificacion),
    [editedData.nif_identificacion],
  )

  const [isSaving, setIsSaving] = useState(false)
  const recibidas = useMemo(() => {
    return initialDocs
      .filter((doc) => {
        const type = (doc.doc_type || "").toLowerCase()
        return type === "factura" || type === "gasto"
      })
      .map((doc) => ({
        id: String(doc.id),
        sourceType: "recibida" as const,
        cliente: clientLabel(doc),
        contraparte: counterpartyLabel(doc),
        estado: resolveStatusLabel(doc.status),
        fecha: toLocaleDate(doc),
        confianza: computeConfidence(doc.invoice_data),
        doc,
        invoiceData: doc.invoice_data || {},
      }))
  }, [initialDocs])

  const emitidas = useMemo(() => {
    return initialDocs
      .filter((doc) => (doc.doc_type || "").toLowerCase() === "ingreso")
      .map((doc) => ({
        id: String(doc.id),
        sourceType: "emitida" as const,
        cliente: clientLabel(doc),
        contraparte: counterpartyLabel(doc),
        estado: resolveStatusLabel(doc.status),
        fecha: toLocaleDate(doc),
        confianza: computeConfidence(doc.invoice_data),
        doc,
        invoiceData: doc.invoice_data || {},
      }))
  }, [initialDocs])

  const sortedRecibidas = useMemo(() => {
    return [...recibidas].sort((left, right) => {
      const priorityDiff = getStatusPriority(left.doc.status) - getStatusPriority(right.doc.status)
      if (priorityDiff !== 0) return priorityDiff
      return getUploadedAtMillis(right.doc) - getUploadedAtMillis(left.doc)
    })
  }, [recibidas])

  const sortedEmitidas = useMemo(() => {
    return [...emitidas].sort((left, right) => {
      const priorityDiff = getStatusPriority(left.doc.status) - getStatusPriority(right.doc.status)
      if (priorityDiff !== 0) return priorityDiff
      return getUploadedAtMillis(right.doc) - getUploadedAtMillis(left.doc)
    })
  }, [emitidas])

  const clientOptions = useMemo(() => {
    const names = new Set<string>()
    ;[...recibidas, ...emitidas].forEach((row) => {
      const clientName = row.cliente
      const isValidClient = clientName && clientName.trim() !== "" && clientName !== "Cliente"
      if (isValidClient) {
        names.add(row.cliente)
      }
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [recibidas, emitidas])

  const uploadBusinessOptions = useMemo(() => {
    return (businessOptions || [])
      .map((business) => ({
        id: String(business.id || ""),
        label: business.name || business.business_name || "Cliente",
      }))
      .filter((business) => business.id)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [businessOptions])

  const selectedClientRows = useMemo(() => {
    if (!filters.client || filters.client === "all") return []
    return [...sortedRecibidas, ...sortedEmitidas].filter((row) => row.cliente === filters.client)
  }, [filters.client, sortedRecibidas, sortedEmitidas])

  const filteredRecibidas = useMemo(() => {
    let result = sortedRecibidas
    if (filters.status) {
      result = result.filter((row) => row.doc.status === filters.status)
    }
    if (filters.client) {
      result = result.filter((row) => row.cliente === filters.client)
    }
    if (filters.dateFromMillis) {
      result = result.filter((row) => toDateMillis(row.doc) >= filters.dateFromMillis!)
    }
    if (filters.dateToMillis) {
      result = result.filter((row) => toDateMillis(row.doc) <= filters.dateToMillis!)
    }
    return result
  }, [sortedRecibidas, filters])

  const filteredEmitidas = useMemo(() => {
    let result = sortedEmitidas
    if (filters.status) {
      result = result.filter((row) => row.doc.status === filters.status)
    }
    if (filters.client) {
      result = result.filter((row) => row.cliente === filters.client)
    }
    if (filters.dateFromMillis) {
      result = result.filter((row) => toDateMillis(row.doc) >= filters.dateFromMillis!)
    }
    if (filters.dateToMillis) {
      result = result.filter((row) => toDateMillis(row.doc) <= filters.dateToMillis!)
    }
    return result
  }, [sortedEmitidas, filters])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, filters.client, filters.status, filters.dateFromMillis, filters.dateToMillis])

  const activeRows = activeTab === "recibidas" ? filteredRecibidas : filteredEmitidas
  const totalPages = Math.max(1, Math.ceil(activeRows.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const pageEnd = pageStart + ITEMS_PER_PAGE
  const pagedRows = activeRows.slice(pageStart, pageEnd)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pendingValidation = [...filteredRecibidas, ...filteredEmitidas].filter(
    (row) => row.doc.status !== "Procesado",
  ).length
  const validated = [...filteredRecibidas, ...filteredEmitidas].filter(
    (row) => row.doc.status === "Procesado",
  ).length

  const openValidation = (row: ValidationRow) => {
    setSelectedRow(row)
    setEditedData(rowToEditable(row))
    setIsValidationOpen(true)
  }

  const handleUploadDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!uploadFile) {
      toast.error("Debes seleccionar un archivo")
      return
    }

    if (!uploadBusinessId || uploadBusinessId === "__none") {
      toast.error("Debes seleccionar un cliente específico")
      return
    }

    if (!uploadDocType || uploadDocType === "__none") {
      toast.error("Debes seleccionar el tipo de factura")
      return
    }

    const mappedDocType = uploadDocType === "Emitida" ? "Ingreso" : "Factura"

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("business", uploadBusinessId)
      formData.append("doc_type", mappedDocType)

      const response = await apiFetch("/api/documents/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(parseBackendError(errorData))
      }

      toast.success("Factura subida correctamente")
      setIsUploadOpen(false)
      setUploadFile(null)
      setUploadBusinessId("__none")
      setUploadDocType("__none")
      await mutateDocs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la factura")
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    const loadPreview = async () => {
      if (!selectedRow || !isValidationOpen) {
        setPreviewUrl(null)
        return
      }

      try {
        const response = await apiFetch(`/api/documents/${selectedRow.id}/download/?preview=true`)
        if (!response.ok) {
          if (active) setPreviewUrl(null)
          return
        }

        const blob = await response.blob()
        objectUrl = window.URL.createObjectURL(blob)
        if (active) setPreviewUrl(objectUrl)
      } catch {
        if (active) setPreviewUrl(null)
      }
    }

    void loadPreview()

    return () => {
      active = false
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [selectedRow, isValidationOpen])

  const updateTaxBreakdown = (nextBase: string, nextTipoIva: string, nextRecargo: string) => {
    const base = parseNullableNumber(nextBase) ?? 0
    const iva = parseNullableNumber(nextTipoIva) ?? 0
    const recargo = parseNullableNumber(nextRecargo) ?? 0
    const cuotaIva = (base * iva) / 100
    const cuotaRecargo = (base * recargo) / 100
    const total = base + cuotaIva + cuotaRecargo

    setEditedData((prev) => ({
      ...prev,
      tax_base: nextBase,
      tax_rate: nextTipoIva,
      tipo_recargo_equivalencia: nextRecargo,
      tax_amount: cuotaIva.toFixed(2),
      cuota_recargo_equivalencia: recargo > 0 ? cuotaRecargo.toFixed(2) : "",
      total_amount: total.toFixed(2),
    }))
  }

  const handleValidate = async () => {
    if (!selectedRow) return

    // Check NIF validity early before saving
    if (!nifValidation.valid) {
      toast.error(nifValidation.message || "El NIF es inválido. Por favor, corrígelo antes de validar.")
      return
    }

    setIsSaving(true)

    const payload = {
      issue_date: editedData.issue_date || null,
      fecha_operacion: editedData.fecha_operacion || null,
      serie: editedData.serie || null,
      invoice_number: editedData.invoice_number || null,
      invoice_number_final: editedData.invoice_number_final || null,
      nif_codigo_pais: editedData.nif_codigo_pais || null,
      nif_identificacion: editedData.nif_identificacion || null,
      clave_operacion: editedData.clave_operacion || "01",
      total_amount: parseNullableNumber(editedData.total_amount),
      tax_base: parseNullableNumber(editedData.tax_base),
      tax_rate: parseNullableNumber(editedData.tax_rate),
      tax_amount: parseNullableNumber(editedData.tax_amount),
      tipo_recargo_equivalencia: parseNullableNumber(editedData.tipo_recargo_equivalencia),
      cuota_recargo_equivalencia: parseNullableNumber(editedData.cuota_recargo_equivalencia),
    }

    try {
      const response = await apiFetch(`/api/documents/${selectedRow.id}/validate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Procesado",
          invoice_data: payload,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(parseBackendError(errorData))
      }

      toast.success("Factura validada correctamente")
      window.dispatchEvent(new Event("consultoritas:documents-updated"))
      setIsValidationOpen(false)
      setSelectedRow(null)
      setPreviewUrl(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo validar la factura")
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenInNewTab = async (row: ValidationRow) => {
    try {
      const response = await apiFetch(`/api/documents/${row.id}/download/?preview=true`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(parseBackendError(errorData))
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => window.URL.revokeObjectURL(url), 5000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir el archivo")
    }
  }

  const handleDeleteDocument = async (row: ValidationRow) => {
    if (!window.confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return
    try {
      const response = await apiFetch(`/api/documents/${row.id}/`, { method: "DELETE" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(parseBackendError(errorData))
      }
      toast.success("Factura eliminada")
      window.dispatchEvent(new Event("consultoritas:documents-updated"))
      if (selectedRow?.id === row.id) {
        setIsValidationOpen(false)
        setSelectedRow(null)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la factura")
    }
  }

  const executeExport = (type: "recibidas" | "emitidas" | "ambas") => {
    const processedRecibidas = filteredRecibidas.filter((row) => row.doc.status === "Procesado")
    const processedEmitidas = filteredEmitidas.filter((row) => row.doc.status === "Procesado")
    const exportRows =
      type === "recibidas"
        ? processedRecibidas
        : type === "emitidas"
          ? processedEmitidas
          : [...processedRecibidas, ...processedEmitidas]

    if (exportRows.length === 0) {
      toast.error("No hay facturas para exportar con los filtros actuales")
      return
    }

    void (async () => {
      try {
        const ExcelJsModule = (await import("exceljs")) as {
          Workbook: new () => {
            addWorksheet: (name: string) => any
            xlsx: { writeBuffer: () => Promise<ArrayBuffer> }
          }
        }
        const { Workbook } = ExcelJsModule
        const workbook = new Workbook()
        const headers = [
          "Fecha Expedición",
          "Fecha Operación",
          "Serie",
          "Número",
          "NIF Código País",
          "NIF Identificación",
          "Clave Operación",
          "Base Imponible",
          "Tipo IVA",
          "Cuota IVA",
          "Tipo Recargo",
          "Cuota Recargo",
          "Total Factura",
        ]

        const fillWorksheet = (sheetName: string, rows: ValidationRow[]) => {
          const worksheet = workbook.addWorksheet(sheetName)
          worksheet.addRow(headers)
          worksheet.views = [{ state: "frozen", ySplit: 1 }]
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length },
          }

          rows.forEach((row) => {
            const data = row.invoiceData || {}
            worksheet.addRow([
              data.issue_date || row.fecha,
              data.fecha_operacion || data.issue_date || row.fecha,
              data.serie || "",
              data.invoice_number || "",
              data.nif_codigo_pais || "ES",
              data.nif_identificacion || data.supplier_tax_id || "",
              data.clave_operacion || "01",
              safeNumber(data.tax_base),
              safeNumber(data.tax_rate),
              safeNumber(data.tax_amount),
              safeNumber(data.tipo_recargo_equivalencia),
              safeNumber(data.cuota_recargo_equivalencia),
              safeNumber(data.total_amount ?? row.doc.amount),
            ])
          })

          const headerRow = worksheet.getRow(1)
          headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true }
          headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_HEADER_FILL } }

          for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
            const row = worksheet.getRow(rowIndex)
            if (rowIndex % 2 === 0) {
              row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_ZEBRA_FILL } }
            }
            row.getCell(1).numFmt = "dd/mm/yyyy"
            row.getCell(2).numFmt = "dd/mm/yyyy"
            ;[8, 10, 12, 13].forEach((col) => {
              row.getCell(col).numFmt = '#,##0.00 "€"'
              row.getCell(col).alignment = { horizontal: "right" }
            })
            row.getCell(9).numFmt = '0.00"%"'
            row.getCell(11).numFmt = '0.00"%"'
          }

          worksheet.columns.forEach((column: { values?: Array<unknown>; width?: number }) => {
            const maxLength = column.values?.reduce((acc: number, value: unknown) => {
              const current = value == null ? 0 : value instanceof Date ? 10 : String(value).length
              return Math.max(acc, current)
            }, 12) || 12
            column.width = Math.min(Math.max(maxLength + 2, 12), 34)
          })
        }

        if (type === "ambas") {
          fillWorksheet("Facturas Recibidas", processedRecibidas)
          fillWorksheet("Facturas Emitidas", processedEmitidas)
        } else if (type === "recibidas") {
          fillWorksheet("Facturas Recibidas", processedRecibidas)
        } else {
          fillWorksheet("Facturas Emitidas", processedEmitidas)
        }

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `validacion-aeat-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`
        anchor.click()
        window.URL.revokeObjectURL(url)

        toast.success("Exportación completada")
        setIsExportOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo exportar el Excel")
      }
    })()
  }

  const handleExportExcel = (type: "recibidas" | "emitidas" | "ambas") => {
    if (!filters.client || filters.client === "all") {
      toast.error("Para exportar primero debes filtrar un cliente específico")
      return
    }

    const hasUnprocessed = selectedClientRows.some((row) => row.doc.status !== "Procesado")
    if (hasUnprocessed) {
      setPendingExportType(type)
      setShowExportWarning(true)
      return
    }

    executeExport(type)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Validación Documental</h2>
          <p className="text-muted-foreground mt-1">
            Validación oficial AEAT para facturas recibidas y emitidas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2 bg-[#173d77] hover:bg-blue-800 text-white" onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-2 size-4" />
            Subir Factura
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsExportOpen(true)}>
            <FileSpreadsheet className="size-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <DocumentFilter
        onFilterChange={setFilters}
        clientFilter={filters.client || "all"}
        onClientFilterChange={(value) => setFilters((prev) => ({ ...prev, client: value === "all" ? undefined : value }))}
        clientOptions={clientOptions}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{filteredRecibidas.length + filteredEmitidas.length}</p>
                <p className="text-sm text-muted-foreground">Facturas filtradas</p>
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
                <p className="text-sm text-muted-foreground">Validadas</p>
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
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
              <CardDescription>Campos oficiales AEAT para validar y corregir.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fiabilidad IA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length > 0 ? (
                    pagedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.cliente}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{row.contraparte}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(statusMap[(row.doc.status || "").toLowerCase()]?.className || "bg-gray-100")}>{row.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              row.confianza >= 85
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : row.confianza >= 60
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200",
                            )}
                          >
                            <Sparkles className="size-3 mr-1" />
                            {row.confianza}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openValidation(row)} className="gap-1.5">
                              <Eye className="size-3.5 mr-1.5" />
                              Validar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenInNewTab(row)}>Abrir en pestaña nueva</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteDocument(row)}>Eliminar factura</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No hay facturas recibidas para validar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-3 pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {activeRows.length === 0 ? 0 : pageStart + 1}-{Math.min(pageEnd, activeRows.length)} de {activeRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    disabled={safeCurrentPage <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                    disabled={safeCurrentPage >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emitidas" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Facturas Emitidas</CardTitle>
              <CardDescription>También pueden validarse igual que las recibidas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fiabilidad IA</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.length > 0 ? (
                    pagedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.cliente}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{row.contraparte}</TableCell>
                        <TableCell>{row.estado}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              row.confianza >= 85
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : row.confianza >= 60
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200",
                            )}
                          >
                            <Sparkles className="size-3 mr-1" />
                            {row.confianza}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openValidation(row)} className="gap-1.5">
                              <Eye className="size-3.5 mr-1.5" />
                              Validar
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenInNewTab(row)}>Abrir en pestaña nueva</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onClick={() => handleDeleteDocument(row)}>Eliminar factura</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No hay facturas emitidas para validar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-3 pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {activeRows.length === 0 ? 0 : pageStart + 1}-{Math.min(pageEnd, activeRows.length)} de {activeRows.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    disabled={safeCurrentPage <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                    disabled={safeCurrentPage >= totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isValidationOpen} onOpenChange={setIsValidationOpen}>
        <DialogContent className="max-w-[1200px] sm:max-w-[95vw] w-full h-[90vh] overflow-hidden p-6 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5" />
              Validación AEAT
            </DialogTitle>
            <DialogDescription>
              Los campos de recibidas y emitidas son los mismos para asegurar coherencia con el Excel oficial.
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="grid gap-6 md:grid-cols-[1.8fr_1fr] flex-1 overflow-hidden">
              <div className="space-y-4 overflow-hidden flex flex-col min-w-0">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h4 className="font-medium text-sm text-foreground">Documento Original</h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      selectedRow.confianza >= 85
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedRow.confianza >= 60
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200",
                    )}
                  >
                    <Sparkles className="size-3 mr-1" />
                    Fiabilidad IA: {selectedRow.confianza}%
                  </Badge>
                </div>
                <div className="flex-1 min-h-0 rounded-lg border border-border bg-muted overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-end gap-2 p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer")
                        }}
                      >
                        <Eye className="size-4 mr-2" />
                        Abrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.open(`/api/documents/${selectedRow.id}/download/`, "_blank", "noopener,noreferrer")
                        }}
                      >
                        <Download className="size-4 mr-2" />
                        Descargar
                      </Button>
                    </div>

                    <div className="flex-1 overflow-hidden p-2">
                      {previewUrl ? (
                        <iframe
                          title={`Documento ${selectedRow.id}`}
                          src={previewUrl}
                          className="h-full w-full bg-white rounded-md"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                          No se pudo cargar la vista previa del documento.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto flex flex-col min-w-0">
                <h4 className="font-medium text-base text-foreground flex-shrink-0">Campos oficiales AEAT</h4>
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4 overflow-y-auto flex-1">
                  <div className="space-y-1">
                    <Label className="text-sm">Cliente</Label>
                    <Input value={selectedRow.cliente} readOnly className="bg-muted/50 h-10 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Contraparte</Label>
                    <Input value={selectedRow.contraparte} readOnly className="bg-muted/50 h-10 text-sm" />
                  </div>

                  <Separator className="my-2" />
                  <h5 className="font-medium text-sm">Datos de factura</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Fecha Expedición</Label>
                      <Input type="date" value={editedData.issue_date} onChange={(e) => setEditedData({ ...editedData, issue_date: e.target.value })} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Fecha Operación</Label>
                      <Input type="date" value={editedData.fecha_operacion} onChange={(e) => setEditedData({ ...editedData, fecha_operacion: e.target.value })} className="h-10 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Serie</Label>
                      <Input value={editedData.serie} onChange={(e) => setEditedData({ ...editedData, serie: e.target.value })} className="h-10 text-sm" maxLength={50} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Número</Label>
                      <Input value={editedData.invoice_number} onChange={(e) => setEditedData({ ...editedData, invoice_number: e.target.value })} className="h-10 text-sm" maxLength={50} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Número Final</Label>
                      <Input value={editedData.invoice_number_final} onChange={(e) => setEditedData({ ...editedData, invoice_number_final: e.target.value })} className="h-10 text-sm" maxLength={50} />
                    </div>
                  </div>

                  <Separator className="my-2" />
                  <h5 className="font-medium text-sm">Datos fiscales</h5>
                  <div className="space-y-1">
                    <Label className="text-sm">Clave Operación</Label>
                    <Select value={editedData.clave_operacion} onValueChange={(value) => setEditedData({ ...editedData, clave_operacion: value })}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">01 - General</SelectItem>
                        <SelectItem value="02">02 - Exportación</SelectItem>
                        <SelectItem value="03">03 - Intracomunitaria</SelectItem>
                        <SelectItem value="04">04 - Exenta</SelectItem>
                        <SelectItem value="05">05 - Inversión SP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Código País</Label>
                      <Input value={editedData.nif_codigo_pais} onChange={(e) => setEditedData({ ...editedData, nif_codigo_pais: e.target.value.toUpperCase() })} className="h-10 text-sm" maxLength={2} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">NIF Identificación</Label>
                      <div className="relative">
                        <Input
                          value={editedData.nif_identificacion}
                          onChange={(e) => setEditedData({ ...editedData, nif_identificacion: e.target.value })}
                          className={cn("h-10 text-sm", !nifValidation.valid && "border-rose-500 bg-rose-50/30")}
                          maxLength={15}
                        />
                        {!nifValidation.valid && (
                          <div className="absolute right-3 top-2.5">
                            <AlertCircle className="size-5 text-rose-500" />
                          </div>
                        )}
                      </div>
                      {!nifValidation.valid && (
                        <p className="text-xs text-rose-600 mt-1">{nifValidation.message}</p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-2" />
                  <h5 className="font-medium text-sm">Desglose de importes</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Base Imponible (€)</Label>
                      <Input
                        type="number"
                        onKeyDown={handleNumericKeyDown}
                        step="0.01"
                        min="0"
                        value={editedData.tax_base}
                        onChange={(e) => updateTaxBreakdown(e.target.value, editedData.tax_rate, editedData.tipo_recargo_equivalencia)}
                        className="text-right h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Tipo IVA (%)</Label>
                      <Select value={editedData.tax_rate} onValueChange={(value) => updateTaxBreakdown(editedData.tax_base, value, editedData.tipo_recargo_equivalencia)}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="4">4%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Tipo Recargo Equivalencia (%)</Label>
                      <Input
                        type="number"
                        onKeyDown={handleNumericKeyDown}
                        step="0.01"
                        min="0"
                        value={editedData.tipo_recargo_equivalencia}
                        onChange={(e) => updateTaxBreakdown(editedData.tax_base, editedData.tax_rate, e.target.value)}
                        className="text-right h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Total Factura (€)</Label>
                      <Input value={editedData.total_amount} readOnly className="text-right font-bold text-sm bg-muted/50 h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-sm">Cuota IVA Repercutida (€)</Label>
                      <Input value={editedData.tax_amount} readOnly className="text-right bg-muted/50 h-10 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Cuota Recargo Equivalencia (€)</Label>
                      <Input value={editedData.cuota_recargo_equivalencia} readOnly className="text-right bg-muted/50 h-10 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-gradient-to-t from-white/60 to-transparent pt-4">
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 text-sm" onClick={handleValidate} disabled={isSaving}>
                      {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
                      Validar Datos
                    </Button>
                    <Button variant="outline" className="w-36 h-10" onClick={() => setIsValidationOpen(false)}>
                      <X className="size-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Subir factura para cliente
            </DialogTitle>
            <DialogDescription>
              Selecciona el archivo y el cliente al que pertenece. El OCR seguirá el flujo normal del sistema.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 py-2" onSubmit={handleUploadDocument}>
            <div className="space-y-2">
              <Label htmlFor="upload-file">Archivo</Label>
              <Input
                id="upload-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setUploadFile(event.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de factura</Label>
              <Select value={uploadDocType} onValueChange={setUploadDocType}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Selecciona el tipo</SelectItem>
                  <SelectItem value="Recibida">Recibida</SelectItem>
                  <SelectItem value="Emitida">Emitida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={uploadBusinessId} onValueChange={setUploadBusinessId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Selecciona un cliente</SelectItem>
                  {uploadBusinessOptions.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading} className="bg-[#173d77] hover:bg-blue-800 text-white">
                {isUploading ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExportWarning} onOpenChange={setShowExportWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Facturas sin procesar detectadas</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente seleccionado tiene facturas pendientes de validar o en cola. Estas facturas no se incluirán o tendrán datos incompletos en el Excel. ¿Deseas exportar de todos modos?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExportWarning(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const nextType = pendingExportType || "ambas"
                setShowExportWarning(false)
                setPendingExportType(null)
                executeExport(nextType)
              }}
            >
              Sí, exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5" />
              Exportar validación a Excel
            </DialogTitle>
            <DialogDescription>
              Exporta los campos oficiales AEAT para facturas recibidas, emitidas o ambas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" onClick={() => handleExportExcel("recibidas")}>
              <Download className="size-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Facturas Recibidas</p>
                <p className="text-xs text-muted-foreground">{filteredRecibidas.length} documentos</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4" onClick={() => handleExportExcel("emitidas")}>
              <ArrowUpDown className="size-5 text-accent" />
              <div className="text-left">
                <p className="font-medium">Facturas Emitidas</p>
                <p className="text-xs text-muted-foreground">{filteredEmitidas.length} documentos</p>
              </div>
            </Button>
            <Button className="w-full justify-start gap-3 h-auto py-4" onClick={() => handleExportExcel("ambas")}>
              <FileSpreadsheet className="size-5" />
              <div className="text-left">
                <p className="font-medium">Exportar Ambas</p>
                <p className="text-xs text-white">
                  {filteredRecibidas.length + filteredEmitidas.length} documentos en total
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
