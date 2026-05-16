"use client"

import { useState, useEffect } from "react"
import { User, Building2, Save, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { apiFetch, parseBackendError } from "@/lib/api"

const namePattern = "^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$"
const taxIdPattern = "^[A-Za-z0-9-]{6,20}$"

export function AjustesView() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  })

  const [fiscalData, setFiscalData] = useState({
    id: "",
    name: "",
    tax_id: "",
      sector: "",
  })
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" })

  // 1. Cargar datos reales al montar el componente
  useEffect(() => {
    async function loadData() {
      try {
        // Obtenemos perfil y empresa en paralelo
        const [userRes, businessRes] = await Promise.all([
          apiFetch("/api/users/me/"),
          apiFetch("/api/business/my_business/"),
        ])

        if (userRes.ok && businessRes.ok) {
          const user = await userRes.json()
          const business = await businessRes.json()

          setUserData({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || ""
          })

          setFiscalData({
            id: business.id || "",
            name: business.name || "",
            tax_id: business.tax_id || "",
            sector: business.sector || ""
          })
        }
      } catch {
        toast.error("Error al cargar la configuración")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // 2. Función para guardar cambios
  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!fiscalData.id) {
        toast.error("No se ha identificado la empresa. Refresca la página o contacta con soporte.")
        return
      }

      const [userRes, businessRes] = await Promise.all([
        apiFetch("/api/users/me/", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: userData.first_name,
            last_name: userData.last_name,
          }),
        }),
        apiFetch(`/api/business/companies/${fiscalData.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fiscalData.name,
            tax_id: fiscalData.tax_id,
            sector: fiscalData.sector,
          }),
        }),
      ])

      if (!userRes.ok || !businessRes.ok) {
        const userErr = await userRes.json().catch(() => ({}))
        const businessErr = await businessRes.json().catch(() => ({}))
        const message = parseBackendError(userErr.detail || userErr.error || businessErr.detail || businessErr.error || userErr || businessErr)
        toast.error(message)
        return
      }

      const updatedUser = await userRes.json().catch(() => null)
      const updatedBusiness = await businessRes.json().catch(() => null)
      if (updatedUser) {
        setUserData({
          first_name: updatedUser.first_name || "",
          last_name: updatedUser.last_name || "",
          email: updatedUser.email || userData.email,
        })
      }
      if (updatedBusiness) {
        setFiscalData((prev) => ({
          ...prev,
          id: updatedBusiness.id || prev.id,
          name: updatedBusiness.name || "",
          tax_id: updatedBusiness.tax_id || "",
          sector: updatedBusiness.sector || "",
        }))
      }

      toast.success("Configuración guardada correctamente")
      window.dispatchEvent(new Event("consultoritas:profile-updated"))
    } catch {
      toast.error("No se pudieron guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error("Completa la contraseña actual y la nueva")
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Las nuevas contraseñas no coinciden")
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await apiFetch("/api/users/change_password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(parseBackendError(errorData))
      }

      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      toast.success("Contraseña actualizada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña")
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Gestiona tu perfil y datos fiscales de Consultoritas.</p>
      </div>

      <div className="grid gap-6">
        {/* Perfil de Usuario */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <CardTitle>Perfil Personal</CardTitle>
            </div>
            <CardDescription>Tu información de contacto básica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={userData.first_name}
                  onChange={(e) => setUserData({...userData, first_name: e.target.value})}
                  maxLength={50}
                  pattern={namePattern}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input
                  id="last_name"
                  value={userData.last_name}
                  onChange={(e) => setUserData({...userData, last_name: e.target.value})}
                  maxLength={80}
                  pattern={namePattern}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={userData.email} disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <CardTitle>Seguridad</CardTitle>
            </div>
            <CardDescription>Cambia tu contraseña desde aquí.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current_password">Contraseña actual</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData((current) => ({ ...current, current_password: e.target.value }))}
                maxLength={128}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">Nueva contraseña</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData((current) => ({ ...current, new_password: e.target.value }))}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData((current) => ({ ...current, confirm_password: e.target.value }))}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="button" variant="outline" onClick={handleChangePassword} disabled={isChangingPassword} className="gap-2">
                {isChangingPassword ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Cambiar contraseña
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Datos Fiscales */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-accent" />
              <CardTitle>Datos de Autónomo / Empresa</CardTitle>
            </div>
            <CardDescription>Información vinculada a tu cuenta de Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social / Nombre Comercial</Label>
              <Input
                id="razonSocial"
                value={fiscalData.name}
                onChange={(e) => setFiscalData({...fiscalData, name: e.target.value})}
                maxLength={120}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF / CIF</Label>
                <Input
                  id="nif"
                  value={fiscalData.tax_id}
                  onChange={(e) => setFiscalData({...fiscalData, tax_id: e.target.value})}
                  maxLength={20}
                  pattern={taxIdPattern}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector de actividad</Label>
                <Input
                  id="sector"
                  value={fiscalData.sector}
                  onChange={(e) => setFiscalData({...fiscalData, sector: e.target.value})}
                  maxLength={80}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled={isSaving}>Cancelar</Button>
        <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}
