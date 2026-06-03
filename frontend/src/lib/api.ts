export function getCookie(name: string) {
  const value = `; ${typeof document !== 'undefined' ? document.cookie : ''}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}

export interface InvoiceDataAEAT {
  id?: string
  document?: string
  issue_date?: string | null
  fecha_operacion?: string | null
  serie?: string | null
  invoice_number?: string | null
  invoice_number_final?: string | null
  nif_tipo?: "NIF" | "CIF" | "NIE" | "PASAPORTE" | "IVA" | null
  nif_codigo_pais?: string | null
  nif_identificacion?: string | null
  clave_operacion?: "01" | "02" | "03" | "04" | "05" | null
  total_amount?: number | null
  tax_base?: number | null
  tax_rate?: number | null
  tax_amount?: number | null
  tipo_recargo_equivalencia?: number | null
  cuota_recargo_equivalencia?: number | null
  supplier_name?: string | null
  supplier_tax_id?: string | null
  currency?: string | null
}

export interface DocumentoFacturacion {
  id: string
  business: string
  uploaded_by?: {
    id?: string
    first_name?: string
    last_name?: string
    email?: string
  } | null
  file_name: string
  storage_path: string
  status: "En cola" | "Pendiente" | "Procesado" | "Error"
  doc_type: "Factura" | "Gasto" | "Ingreso" | string
  uploaded_at: string
  invoice_data?: InvoiceDataAEAT | null
}

export interface TaxCalendarBusiness {
  id: string
  name: string
  responsible_advisor_id?: string | null
  responsible_advisor_name?: string | null
  has_employees?: boolean
  has_office_rent?: boolean
}

export interface TaxCalendarEntry {
  id: string
  business: TaxCalendarBusiness
  business_name?: string
  tax_type: string
  period: string
  period_start: string
  period_end: string
  deadline: string
  is_presented: boolean
  presented_date?: string | null
  notes?: string
  created_at: string
  updated_at: string
}

async function ensureCsrf() {
  await fetch('/api/csrf/', { credentials: 'include' })
}

function mergeHeaders(existing: HeadersInit | undefined, extra: Record<string, string>) {
  const headers = new Headers(existing)
  Object.entries(extra).forEach(([key, value]) => {
    headers.set(key, value)
  })
  return headers
}

const criticalNoStorePaths = [
  '/api/users/me/',
  '/api/users/stats/',
  '/api/users/clients/',
  '/api/users/login/',
  '/api/users/logout/',
  '/api/business/companies/',
  '/api/business/appointments/',
  '/api/business/my_business/',
  '/api/business/dashboard_summary/',
  '/api/business/tax-calendar/',
  '/api/business/tax_calendar/',
  '/api/documents/',
  '/api/documents/tax-calendar/',
  '/api/documents/stats/',
]

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : ''

  if (method === 'GET' && criticalNoStorePaths.some((path) => requestUrl.includes(path))) {
    init.cache = init.cache || 'no-store'
  }

  init.credentials = init.credentials || 'include'

  if (!safeMethods.includes(method)) {
    await ensureCsrf()
    const csrftoken = getCookie('csrftoken')
    if (csrftoken) {
      init.headers = mergeHeaders(init.headers, { 'X-CSRFToken': csrftoken })
    }
  }

  return fetch(input, init)
}

function normalizeBackendMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeBackendMessages(item))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([field, nested]) => {
      const label = field.replace(/_/g, ' ')
      return normalizeBackendMessages(nested).map((message) => `${label}: ${message}`)
    })
  }

  if (value === null || value === undefined || value === '') {
    return []
  }

  return [String(value)]
}

export function parseBackendError(errorData: any): string {
  const messages = normalizeBackendMessages(errorData)
    .map((message) => message
      .replace(/This field is required\.?/g, 'Este campo es obligatorio.')
      .replace(/Enter a valid email address\.?/g, 'Introduce un email válido.')
      .replace(/Ensure this value has at least \d+ characters?\.?/g, 'La contraseña es demasiado corta.')
      .replace(/Ensure this value is greater than or equal to 0\.?/g, 'El valor no puede ser negativo.')
      .replace(/\bnull\b/g, '')
      .trim()
    )
    .filter(Boolean)

  if (messages.length === 0) {
    return 'Algo ha salido mal. Inténtalo de nuevo.'
  }

  return messages.join(' | ')
}

export default apiFetch
