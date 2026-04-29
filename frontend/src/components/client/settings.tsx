"use client"

import { useState } from "react"
import { User, Building2, Bell, Save, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

export function AjustesView() {
  const [userData, setUserData] = useState({
    nombre: "María",
    apellidos: "Castro López",
    email: "maria.castro@email.com",
  })

  const [fiscalData, setFiscalData] = useState({
    razonSocial: "María Castro López",
    nif: "12345678A",
    direccion: "Calle Gran Vía, 28, Madrid",
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">Gestiona tu perfil y datos fiscales.</p>
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
                  value={userData.nombre}
                  onChange={(e) => setUserData({...userData, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userData.email}
                  disabled
                />
              </div>
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
            <CardDescription>Información necesaria para tus modelos fiscales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social / Nombre Comercial</Label>
              <Input
                id="razonSocial"
                value={fiscalData.razonSocial}
                onChange={(e) => setFiscalData({...fiscalData, razonSocial: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nif">NIF / CIF</Label>
                <Input
                  id="nif"
                  value={fiscalData.nif}
                  onChange={(e) => setFiscalData({...fiscalData, nif: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección Fiscal</Label>
                <Input
                  id="address"
                  value={fiscalData.direccion}
                  onChange={(e) => setFiscalData({...fiscalData, direccion: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-emerald-500" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-email">Avisos de impuestos por email</Label>
              <Switch id="notif-email" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-ia">Alertas de la IA (Facturas dudosas)</Label>
              <Switch id="notif-ia" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancelar</Button>
        <Button className="gap-2">
          <Save className="size-4" /> Guardar Cambios
        </Button>
      </div>
    </div>
  )
}
