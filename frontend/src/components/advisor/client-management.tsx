"use client"

import { useEffect, useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Plus, AlertCircle, CheckCircle2, MoreHorizontal, Bot, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { useApiData } from "@/lib/use-api"
import { mutate as globalMutate } from "swr"
interface GestionClientesProps {
  onNavigateToMonitor: (clientId: string) => void
}

const ITEMS_PER_PAGE = 10

type Client = {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  name?: string
  cif?: string
  tax_status?: "AL DÍA" | "INCIDENCIA" | string
  is_active?: boolean
  primary_business?: {
    id?: string | null
    has_employees?: boolean
    has_office_rent?: boolean
    responsible_advisor_id?: string | null
    responsible_advisor_name?: string | null
  }
}

type TaxCalendarEntry = {
  business?: { id?: string }
  period_start?: string
  deadline?: string
  is_presented?: boolean
  tax_type?: string
}

type EditableClient = {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  has_employees?: boolean
  has_office_rent?: boolean
  primary_business_id?: string | null
  responsible_advisor_id?: string | null
}

export function GestionClientes({ onNavigateToMonitor }: GestionClientesProps) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")
  const [fiscalFilter, setFiscalFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [advisorFilter, setAdvisorFilter] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "Autónomo",
    has_employees: false,
    has_office_rent: false,
    responsible_advisor_id: "",
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<EditableClient | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editHasEmployees, setEditHasEmployees] = useState(false)
  const [editHasOfficeRent, setEditHasOfficeRent] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [confirmEmailInput, setConfirmEmailInput] = useState("")
  const clientsUrl = `/api/users/clients/?search=${encodeURIComponent(debouncedSearch)}&page=1&page_size=20`
  const { data: clients = [], mutate: mutateClients, isLoading: isClientsLoading } = useApiData<Client[]>(clientsUrl, {
    dedupingInterval: 30_000,
  })
  const { data: businesses = [], mutate: mutateBusinesses } = useApiData<Array<{ id?: string; tax_status?: string }>>("/api/business/companies/", {
    dedupingInterval: 30_000,
  })
  const { data: advisors = [] } = useApiData<Array<{ id?: string; first_name?: string; last_name?: string; email?: string }>>("/api/users/?role=Asesor&is_staff=true&page_size=100", {
    dedupingInterval: 60_000,
  })
  const currentYear = new Date().getFullYear()
  const { data: calendarEntries = [] } = useApiData<TaxCalendarEntry[]>(`/api/documents/tax-calendar/?year=${currentYear}`, {
    dedupingInterval: 30_000,
  })

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const refresh = () => {
      void mutateClients()
      void mutateBusinesses()
    }

    window.addEventListener("consultoritas:refresh", refresh)
    return () => {
      window.removeEventListener("consultoritas:refresh", refresh)
    }
  }, [mutateBusinesses, mutateClients])

  const clientsWithTaxStatus = useMemo<Client[]>(() => {
    const businessById = new Map<string, string>()
    const advisorByBusinessId = new Map<string, { id?: string | null; name?: string | null }>()
    for (const business of businesses) {
      if (business?.id) {
        businessById.set(String(business.id), business.tax_status || "AL DÍA")
        const rawBusiness = business as unknown as {
          responsible_advisor_id?: string | null
          responsible_advisor_name?: string | null
        }
        advisorByBusinessId.set(String(business.id), {
          id: rawBusiness.responsible_advisor_id || null,
          name: rawBusiness.responsible_advisor_name || null,
        })
      }
    }

    const pendingByBusiness = new Map<string, boolean>()
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const inWindow = (month === 1 || month === 4 || month === 7 || month === 10) && day >= 1 && day <= 20
    if (inWindow) {
      for (const entry of calendarEntries) {
        const businessId = entry.business?.id ? String(entry.business.id) : ""
        if (!businessId) continue
        const periodDate = entry.period_start ? new Date(entry.period_start) : null
        if (!periodDate || Number.isNaN(periodDate.getTime())) continue
        const periodMonth = periodDate.getMonth() + 1
        const periodQuarter = periodMonth <= 3 ? 1 : periodMonth <= 6 ? 2 : periodMonth <= 9 ? 3 : 4
        const currentQuarter = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4
        if (periodDate.getFullYear() !== currentYear || periodQuarter !== currentQuarter) continue
        if (entry.is_presented === false) {
          pendingByBusiness.set(businessId, true)
        }
      }
    }

    return clients.map((client: Client) => {
      const primaryBusinessId = client.primary_business?.id ? String(client.primary_business.id) : ""
      const advisorInfo = advisorByBusinessId.get(primaryBusinessId)
      const derivedStatus =
        inWindow && pendingByBusiness.get(primaryBusinessId)
          ? "Pendiente"
          : (businessById.get(primaryBusinessId) || client.tax_status || "AL DÍA")
      return {
        ...client,
        primary_business: client.primary_business
          ? {
              ...client.primary_business,
              responsible_advisor_id: advisorInfo?.id || client.primary_business.responsible_advisor_id || null,
              responsible_advisor_name: advisorInfo?.name || client.primary_business.responsible_advisor_name || null,
            }
          : client.primary_business,
        tax_status: derivedStatus,
      }
    })
  }, [businesses, clients, calendarEntries])

  const advisorOptions = useMemo(() => {
    const options = new Map<string, string>()

    for (const client of clientsWithTaxStatus) {
      const advisorId = client.primary_business?.responsible_advisor_id
      if (!advisorId) continue
      options.set(advisorId, client.primary_business?.responsible_advisor_name || "Asesor responsable")
    }

    return Array.from(options.entries()).map(([id, label]) => ({ id, label }))
  }, [clientsWithTaxStatus])

  const advisorSelectOptions = useMemo(() => {
    return (advisors || []).map((a) => ({ id: String(a.id), label: `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email || "Asesor" }))
  }, [advisors])

  const handleAddClient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const loadingId = toast.loading("Creando cliente...")
    try {
      const payload = {
        first_name: newClient.first_name.trim(),
        last_name: newClient.last_name.trim(),
        email: newClient.email.trim().toLowerCase(),
        password: newClient.password.trim(),
        role: newClient.role || "Autónomo",
        has_employees: newClient.has_employees,
        has_office_rent: newClient.has_office_rent,
        responsible_advisor_id: newClient.responsible_advisor_id || undefined,
      }

      const res = await apiFetch("/api/users/create-with-business/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success("Cliente añadido correctamente")
        await mutateClients()
        setIsAddModalOpen(false)
        setNewClient({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          role: "Autónomo",
          has_employees: false,
          has_office_rent: false,
          responsible_advisor_id: "",
        })

        const currentYear = new Date().getFullYear()

        await mutateBusinesses()

        await globalMutate(`/api/documents/tax-calendar/?year=${currentYear}`)

        window.dispatchEvent(new Event("consultoritas:refresh"))
      } else {
        const errorData = await res.json().catch(() => ({}))

        console.error("Detalle del error 400 del backend:", errorData)

        let errorMsg = "Error al añadir cliente"
        if (errorData.email) {
          errorMsg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
        } else if (errorData.password) {
          errorMsg = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password
        } else if (errorData.detail) {
          errorMsg = errorData.detail
        }
        toast.error(errorMsg)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de red")
    } finally {
      toast.dismiss(loadingId)
    }
  }

  const handleToggleActive = async (clientId: string, currentlyActive: boolean) => {
    if (!window.confirm(`¿${currentlyActive ? "Suspender" : "Reactivar"} este cliente?`)) return

    try {
      const res = await apiFetch(`/api/users/${clientId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentlyActive }),
      })

      if (res.ok) {
        toast.success(`Cliente ${currentlyActive ? "suspendido" : "reactivado"} correctamente`)
        const currentYear = new Date().getFullYear()
        await globalMutate("/api/business/companies/")
        await globalMutate(`/api/documents/tax-calendar/?year=${currentYear}`)
        await globalMutate((key) => typeof key === "string" && key.startsWith("/api/users/clients"))

        window.dispatchEvent(new Event("consultoritas:refresh"))
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al actualizar cliente")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de red")
    }
  }

const triggerDeleteVerification = (client: Client) => {
    setClientToDelete(client)
    setConfirmEmailInput("")
    setIsDeleteModalOpen(true)
  }

  const executeDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const res = await apiFetch(`/api/users/${clientToDelete.id}/`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Cliente y datos asociados eliminados del sistema")
        setIsDeleteModalOpen(false)
        setClientToDelete(null)

        const currentYear = new Date().getFullYear()
        await globalMutate("/api/business/companies/")
        await globalMutate(`/api/documents/tax-calendar/?year=${currentYear}`)
        await mutateClients()

        window.dispatchEvent(new Event("consultoritas:refresh"))
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al eliminar cliente")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar cliente")
    }
  }

  const handleEditClient = (client: Client) => {
    setEditClient({
      id: client.id,
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      role: client.role || "Autónomo",
      primary_business_id: client.primary_business?.id || null,
      responsible_advisor_id: client.primary_business?.responsible_advisor_id || null,
      has_employees: client.primary_business?.has_employees || false,
      has_office_rent: client.primary_business?.has_office_rent || false,
    })
    setEditHasEmployees(Boolean(client.primary_business?.has_employees))
    setEditHasOfficeRent(Boolean(client.primary_business?.has_office_rent))
    setIsEditModalOpen(true)
  }

  const handleSaveEditClient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editClient || !editClient.id) return

    setIsUpdating(true)
    const loadingId = toast.loading("Actualizando cliente...")
    try {
      const payload = {
        first_name: editClient.first_name.trim(),
        last_name: editClient.last_name.trim(),
        email: editClient.email.trim().toLowerCase(),
        role: editClient.role.trim() || "Autónomo",
      }

      const res = await apiFetch(`/api/users/${editClient.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al actualizar cliente")
      }

      if (editClient.primary_business_id) {
        const businessPayload = {
          has_employees: editHasEmployees,
          has_office_rent: editHasOfficeRent,
          responsible_advisor_id: editClient.responsible_advisor_id || null,
        }
        const bRes = await apiFetch(`/api/business/companies/${editClient.primary_business_id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(businessPayload),
        })
        if (!bRes.ok) {
          const bErr = await bRes.json().catch(() => ({}))
          throw new Error(bErr.detail || "Error al actualizar empresa del cliente")
        }
      }

      toast.success("Cliente actualizado correctamente")
      setIsEditModalOpen(false)
      await mutateClients()
      const currentYear = new Date().getFullYear()
      await globalMutate("/api/business/companies/")
      await globalMutate(`/api/documents/tax-calendar/?year=${currentYear}`)

      window.dispatchEvent(new Event("consultoritas:refresh"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar cliente")
    } finally {
      setIsUpdating(false)
      toast.dismiss(loadingId)
    }
  }

  const activeClients: Client[] = clientsWithTaxStatus
  const byStatus = activeClients.filter((c: Client) =>
    statusFilter === "all" ? true : statusFilter === "active" ? c.is_active !== false : c.is_active === false,
  )
  const byRole = byStatus.filter((c: Client) =>
    roleFilter === "all" ? true : c.role === roleFilter,
  )
  const byFiscal = byRole.filter((c: Client) =>
    fiscalFilter === "all" ? true : fiscalFilter === "ok" ? c.tax_status === "AL DÍA" : c.tax_status !== "AL DÍA",
  )
  const byAdvisor = byFiscal.filter((client: Client) => {
    const advisorId = client.primary_business?.responsible_advisor_id || ""
    if (advisorFilter === "all") return true
    if (advisorFilter === "unassigned") return !advisorId
    return advisorId === advisorFilter
  })
  const filtered = byAdvisor.filter((client: Client) => {
    const fullName = `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase()
    const email = (client.email || "").toLowerCase()
    return fullName.includes(debouncedSearch.toLowerCase()) || email.includes(debouncedSearch.toLowerCase())
  })

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((left, right) => {
      const leftName = `${left.first_name || ""} ${left.last_name || ""}`.trim().toLowerCase()
      const rightName = `${right.first_name || ""} ${right.last_name || ""}`.trim().toLowerCase()
      return leftName.localeCompare(rightName)
    })
  }, [filtered])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, fiscalFilter, roleFilter, advisorFilter])

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const pageEnd = pageStart + ITEMS_PER_PAGE
  const pagedClients = sortedFiltered.slice(pageStart, pageEnd)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Cartera de Clientes</h2>
          <p className="text-sm text-muted-foreground">Supervisión de estados fiscales y actividad.</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="size-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={newClient.first_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, first_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={newClient.last_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, last_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newClient.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={newClient.password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNewClient({ ...newClient, password: e.target.value })}
                  placeholder="Dejar en blanco para generar una temporal"
                />
                <p className="text-xs text-muted-foreground">Si la dejas vacía, se generará una contraseña segura y se enviará por correo.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <select value={newClient.role} onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewClient({ ...newClient, role: e.target.value })} className="input bg-white p-2 rounded w-full">
                  <option value="Autónomo">Autónomo</option>
                  <option value="Sociedad">Sociedad</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Asesor Responsable</Label>
                <Select value={newClient.responsible_advisor_id || "__none"} onValueChange={(v) => setNewClient({ ...newClient, responsible_advisor_id: v === "__none" ? "" : v })}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin asignar</SelectItem>
                    {advisorSelectOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Obligaciones Fiscales</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Tiene empleados?</label>
                  <Switch checked={newClient.has_employees} onCheckedChange={(v: boolean) => setNewClient({ ...newClient, has_employees: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Alquila oficina?</label>
                  <Switch checked={newClient.has_office_rent} onCheckedChange={(v: boolean) => setNewClient({ ...newClient, has_office_rent: v })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Cliente</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isClientsLoading ? (
        <Card className="border-border/50">
          <CardHeader className="space-y-3 pb-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="rounded-lg border">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-[50px_1.4fr_1.2fr_0.8fr_1.2fr_1fr_0.8fr] items-center gap-4 border-b px-4 py-3 last:border-b-0">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-6 w-24" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="size-8 rounded-full" />
                    <Skeleton className="size-8 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                <div className="flex gap-2">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input bg-white p-2 rounded">
                    <option value="all">Estado: Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input bg-white p-2 rounded">
                    <option value="all">Rol: Todos</option>
                    <option value="Autónomo">Autónomos</option>
                    <option value="Sociedad">Sociedades</option>
                  </select>
                  <select value={fiscalFilter} onChange={(e) => setFiscalFilter(e.target.value)} className="input bg-white p-2 rounded">
                    <option value="all">Fiscal: Todos</option>
                    <option value="ok">AL DÍA</option>
                    <option value="incidence">INCIDENCIA</option>
                  </select>
                  <select value={advisorFilter} onChange={(e) => setAdvisorFilter(e.target.value)} className="input bg-white p-2 rounded">
                    <option value="all">Responsable: Todos</option>
                    <option value="unassigned">Sin asignar</option>
                    {advisorOptions.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>{advisor.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Asesor Responsable</TableHead>
                  <TableHead>Estado Fiscal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay clientes para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : pagedClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Avatar className="size-8">
                    <AvatarFallback>{(client.first_name?.[0] || "C").toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {client.first_name} {client.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{client.email}</TableCell>
                <TableCell>{client.role}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                    {client.primary_business?.responsible_advisor_name || "Sin asignar"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.tax_status == null ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" />
                      Cargando...
                    </span>
                  ) : (
                    <Badge variant="outline" className={client.tax_status === "AL DÍA" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                      {client.tax_status === "AL DÍA" ? <CheckCircle2 className="size-3 mr-1" /> : <AlertCircle className="size-3 mr-1" />}
                      {client.tax_status === "AL DÍA" ? "AL DÍA" : "INCIDENCIA"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onNavigateToMonitor(client.id)} title="Monitor IA" className="mr-1">
                    <Bot className="size-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClient(client)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(client.id, client.is_active !== false)}>
                        {client.is_active !== false ? "Suspender" : "Reactivar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerDeleteVerification(client)} className="text-red-600 font-semibold">
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {sortedFiltered.length === 0 ? 0 : pageStart + 1}-{Math.min(pageEnd, sortedFiltered.length)} de {sortedFiltered.length}
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
      </Card>
        </>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editClient && (
            <form onSubmit={handleSaveEditClient} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editClient.first_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditClient({ ...editClient, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={editClient.last_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditClient({ ...editClient, last_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editClient.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditClient({ ...editClient, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select
                  value={editClient.role}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditClient({ ...editClient, role: e.target.value })}
                  className="input bg-white p-2 rounded w-full"
                >
                  <option value="Autónomo">Autónomo</option>
                  <option value="Sociedad">Sociedad</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Asesor Responsable</Label>
                <Select value={editClient.responsible_advisor_id || "__none"} onValueChange={(v) => setEditClient({ ...editClient, responsible_advisor_id: v === "__none" ? null : v })}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin asignar</SelectItem>
                    {advisorSelectOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Obligaciones Fiscales</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Tiene empleados?</label>
                  <Switch checked={editHasEmployees} onCheckedChange={(v: boolean) => setEditHasEmployees(v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Alquila oficina?</label>
                  <Switch checked={editHasOfficeRent} onCheckedChange={(v: boolean) => setEditHasOfficeRent(v)} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="border-2 border-rose-200">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="size-5" /> Acción Altamente Destructiva
            </DialogTitle>
            <DialogDescription className="text-foreground pt-2">
              Esta acción eliminará permanentemente al cliente <strong>{clientToDelete?.first_name} {clientToDelete?.last_name}</strong>, incluyendo su empresa, facturas y todo su historial de la Matriz de Cumplimiento. Esta operación cumple con la normativa de supresión de datos pero <strong>es irreversible</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Label className="text-sm font-medium">
              Para confirmar, escribe el correo electrónico del cliente (<span className="select-all font-mono text-xs bg-muted p-0.5 rounded">{clientToDelete?.email}</span>):
            </Label>
            <Input
              value={confirmEmailInput}
              onChange={(e) => setConfirmEmailInput(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="border-rose-300 focus-visible:ring-rose-500"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={executeDeleteClient}
              disabled={confirmEmailInput.trim().toLowerCase() !== clientToDelete?.email?.toLowerCase()}
            >
              Entiendo el riesgo, eliminar definitivo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
