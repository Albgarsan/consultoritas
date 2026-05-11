"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, AlertCircle, CheckCircle2, MoreHorizontal, Bot, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

interface GestionClientesProps {
  onNavigateToMonitor: (clientId: string) => void
  clients?: Client[]
}

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
  }
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
}

export function GestionClientes({ onNavigateToMonitor }: GestionClientesProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fiscalFilter, setFiscalFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedOnceRef = useRef(false)
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "Autónomo",
    has_employees: false,
    has_office_rent: false,
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<EditableClient | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editHasEmployees, setEditHasEmployees] = useState(false)
  const [editHasOfficeRent, setEditHasOfficeRent] = useState(false)

  const fetchClients = async () => {
    const isFirstLoad = !hasLoadedOnceRef.current
    if (isFirstLoad) {
      setIsLoading(true)
    }

    try {
      const [clientsRes, businessesRes] = await Promise.all([
        apiFetch(`/api/users/clients/`),
        apiFetch(`/api/business/companies/`),
      ])

      if (!clientsRes.ok) {
        setClients([])
        return
      }

      const clientsData = await clientsRes.json().catch(() => [])
      const businessesData = businessesRes.ok ? await businessesRes.json().catch(() => []) : []
      const parsedClients = Array.isArray(clientsData)
        ? clientsData
        : (clientsData && (clientsData.results || clientsData.data) ? (clientsData.results || clientsData.data) : [])
      const parsedBusinesses = Array.isArray(businessesData)
        ? businessesData
        : (businessesData && (businessesData.results || businessesData.data) ? (businessesData.results || businessesData.data) : [])

      const businessById = new Map<string, string>()
      for (const business of parsedBusinesses) {
        if (business?.id) {
          businessById.set(String(business.id), business.tax_status || "AL DÍA")
        }
      }

      setClients(
        parsedClients.map((client: Client) => {
          const primaryBusinessId = client.primary_business?.id ? String(client.primary_business.id) : ""
          return {
            ...client,
            tax_status: businessById.get(primaryBusinessId) || client.tax_status,
          }
        }),
      )
    } catch {
      setClients([])
    } finally {
      if (isFirstLoad) {
        hasLoadedOnceRef.current = true
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchClients()
    const refresh = () => { fetchClients().catch(() => {}) }
    window.addEventListener("consultoritas:refresh", refresh)
    return () => {
      window.removeEventListener("consultoritas:refresh", refresh)
    }
  }, [])

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingId = toast.loading("Creando cliente...")
    try {
      const payload = {
        first_name: newClient.first_name.trim(),
        last_name: newClient.last_name.trim(),
        email: newClient.email.trim().toLowerCase(),
        password: newClient.password.trim(),
        role: newClient.role || "Autónomo",
      }

      const res = await apiFetch("/api/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const createdUser = await res.json().catch(() => null)

        if (createdUser?.id && ["Autónomo", "Sociedad"].includes(payload.role)) {
          const businessRes = await apiFetch("/api/business/client-business/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: createdUser.id,
              has_employees: newClient.has_employees,
              has_office_rent: newClient.has_office_rent,
            }),
          })

          if (!businessRes.ok) {
            const businessError = await businessRes.json().catch(() => ({}))
            throw new Error(businessError.detail || "Error al crear la empresa del cliente")
          }
        }

        toast.success("Cliente añadido correctamente")
        setIsAddModalOpen(false)
        setNewClient({
          first_name: "",
          last_name: "",
          email: "",
          password: "",
          role: "Autónomo",
          has_employees: false,
          has_office_rent: false,
        })
        window.dispatchEvent(new Event("consultoritas:refresh"))
      } else {
        const errorData = await res.json().catch(() => ({}))
        let errorMsg = "Error al añadir cliente"
        if (errorData.email) {
          errorMsg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
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
        window.dispatchEvent(new Event("consultoritas:refresh"))
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al actualizar cliente")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de red")
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return

    try {
      const res = await apiFetch(`/api/users/${clientId}/`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Cliente eliminado correctamente")
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
      has_employees: client.primary_business?.has_employees || false,
      has_office_rent: client.primary_business?.has_office_rent || false,
    })
    setEditHasEmployees(Boolean(client.primary_business?.has_employees))
    setEditHasOfficeRent(Boolean(client.primary_business?.has_office_rent))
    setIsEditModalOpen(true)
  }

  const handleSaveEditClient = async (e: React.FormEvent) => {
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
      window.dispatchEvent(new Event("consultoritas:refresh"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar cliente")
    } finally {
      setIsUpdating(false)
      toast.dismiss(loadingId)
    }
  }

  const activeClients = clients
  const byStatus = activeClients.filter((c) =>
    statusFilter === "all" ? true : statusFilter === "active" ? c.is_active !== false : c.is_active === false,
  )
  const byRole = byStatus.filter((c) =>
    roleFilter === "all" ? true : c.role === roleFilter,
  )
  const byFiscal = byRole.filter((c) =>
    fiscalFilter === "all" ? true : fiscalFilter === "ok" ? c.tax_status === "AL DÍA" : c.tax_status !== "AL DÍA",
  )
  const filtered = byFiscal.filter((client) => {
    const fullName = `${client.first_name || ""} ${client.last_name || ""}`.toLowerCase()
    const email = (client.email || "").toLowerCase()
    return fullName.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
  })

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
                <Input value={newClient.first_name} onChange={(e) => setNewClient({ ...newClient, first_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={newClient.last_name} onChange={(e) => setNewClient({ ...newClient, last_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={newClient.password}
                  onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                  placeholder="Dejar en blanco para generar una temporal"
                />
                <p className="text-xs text-muted-foreground">Si la dejas vacía, se generará una contraseña segura y se enviará por correo.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <select value={newClient.role} onChange={(e) => setNewClient({ ...newClient, role: e.target.value })} className="input bg-white p-2 rounded w-full">
                  <option value="Autónomo">Autónomo</option>
                  <option value="Sociedad">Sociedad</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Obligaciones Fiscales</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Tiene empleados?</label>
                  <Switch checked={newClient.has_employees} onCheckedChange={(v) => setNewClient({ ...newClient, has_employees: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Alquila oficina?</label>
                  <Switch checked={newClient.has_office_rent} onCheckedChange={(v) => setNewClient({ ...newClient, has_office_rent: v })} />
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

      {isLoading ? (
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
                <div key={index} className="grid grid-cols-[50px_1.4fr_1.2fr_0.8fr_1fr_0.8fr] items-center gap-4 border-b px-4 py-3 last:border-b-0">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20" />
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
                  <TableHead>Estado Fiscal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay clientes para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((client) => (
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
                      <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="text-red-600">
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                <Input value={editClient.first_name} onChange={(e) => setEditClient({ ...editClient, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={editClient.last_name} onChange={(e) => setEditClient({ ...editClient, last_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editClient.email} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select
                  value={editClient.role}
                  onChange={(e) => setEditClient({ ...editClient, role: e.target.value })}
                  className="input bg-white p-2 rounded w-full"
                >
                  <option value="Autónomo">Autónomo</option>
                  <option value="Sociedad">Sociedad</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Obligaciones Fiscales</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Tiene empleados?</label>
                  <Switch checked={editHasEmployees} onCheckedChange={setEditHasEmployees} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <label className="text-sm cursor-pointer">¿Alquila oficina?</label>
                  <Switch checked={editHasOfficeRent} onCheckedChange={setEditHasOfficeRent} />
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
    </div>
  )
}
