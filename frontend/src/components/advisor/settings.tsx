"use client"

import { useState } from "react"
import {
  User, Building2, Calendar, Clock, Save,
  Camera, ShieldCheck, Mail, Briefcase
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

export function AdvisorSettings() {
  const [loading, setLoading] = useState(false)

  // Días de la semana para el horario
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil Profesional</h2>
          <p className="text-muted-foreground text-sm">Gestiona tu información pública, especialidades y disponibilidad de citas.</p>
        </div>
        <Button className="gap-2 bg-primary" onClick={() => {}}>
          <Save className="size-4" /> Guardar Todo
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-2"><User className="size-4" /> Perfil</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Clock className="size-4" /> Mi Horario</TabsTrigger>
          <TabsTrigger value="office" className="gap-2"><Building2 className="size-4" /> Despacho</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA PERFIL --- */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="relative group">
                <div className="size-20 rounded-[2rem] bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 group-hover:border-primary transition-colors overflow-hidden">
                  <Camera className="size-6 text-slate-400 group-hover:text-primary" />
                  {/* Aquí iría la <img /> si ya tuviera foto */}
                </div>
                <button className="absolute -bottom-1 -right-1 bg-primary text-white p-1.5 rounded-xl shadow-lg">
                  <Camera className="size-3" />
                </button>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">Información Pública</CardTitle>
                <CardDescription>Esta información se mostrará en la Landing Page.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input defaultValue="Antonio García" />
              </div>
              <div className="space-y-2">
                <Label>Cargo / Título</Label>
                <Input defaultValue="Socio Principal - Experto Legal" />
              </div>
              <div className="space-y-2">
                <Label>Email de Contacto</Label>
                <Input defaultValue="antonio.garcia@consultoritas.es" />
              </div>
              <div className="space-y-2">
                <Label>Especialidades (Separadas por comas)</Label>
                <Input defaultValue="Fiscal, Judicial, Contabilidad" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA HORARIO --- */}
        <TabsContent value="schedule" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Citas</CardTitle>
              <CardDescription>Configura cuándo pueden los clientes agendar reuniones contigo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid gap-4">
                {days.map((day) => (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 gap-4">
                    <div className="flex items-center gap-3 w-32">
                      <Checkbox id={day} defaultChecked />
                      <Label htmlFor={day} className="font-bold">{day}</Label>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <Input type="time" className="w-24 bg-white" defaultValue="09:00" />
                      <span className="text-muted-foreground">a</span>
                      <Input type="time" className="w-24 bg-white" defaultValue="14:00" />
                      <Separator orientation="vertical" className="h-4 mx-2 hidden sm:block" />
                      <Input type="time" className="w-24 bg-white" defaultValue="16:00" />
                      <span className="text-muted-foreground">a</span>
                      <Input type="time" className="w-24 bg-white" defaultValue="18:30" />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-accent/20 bg-accent/5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">Modo Vacaciones</p>
                  <p className="text-xs text-muted-foreground">Desactivar temporalmente la reserva de citas en la web.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA DESPACHO (Global) --- */}
        <TabsContent value="office" className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Configuración del Despacho</CardTitle>
              <CardDescription>Solo editable por administradores o socios fundadores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razón Social</Label>
                  <Input defaultValue="Consultoritas S.L." />
                </div>
                <div className="space-y-2">
                  <Label>CIF Oficina</Label>
                  <Input defaultValue="B12345678" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
