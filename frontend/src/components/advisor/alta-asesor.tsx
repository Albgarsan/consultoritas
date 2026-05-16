"use client"

import { FormEvent, useState } from "react"
import { Loader2, Calculator, Gavel, Scale, Briefcase } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AltaAsesorProps {
  onSuccess?: () => void
}

const SPECIALTY_OPTIONS = [
  { id: "contable", label: "Contable", icon: Scale },
  { id: "laboral", label: "Laboral", icon: Briefcase },
  { id: "judicial", label: "Jurídica", icon: Gavel },
  { id: "fiscal", label: "Fiscal", icon: Calculator },
]

export function AltaAsesor({ onSuccess }: AltaAsesorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(false)
  const [isPrincipal, setIsPrincipal] = useState(false)
  const [specialties, setSpecialties] = useState<string[]>([])

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  })

  const handlePasswordToggle = (checked: boolean) => {
    setAutoGeneratePassword(checked)
    if (checked) {
      setFormData({ ...formData, password: "" })
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const toastId = toast.loading("Creando asesor...")

    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: autoGeneratePassword ? "" : formData.password.trim(),
        specialties,
        is_principal: isPrincipal,
      }

      const res = await apiFetch("/api/users/create_advisor/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || "Error al crear el asesor")
      }

      const newAdvisor = await res.json()
      toast.success("Asesor creado correctamente")

      if (newAdvisor.generated_password) {
        toast.info(`Contraseña generada: ${newAdvisor.generated_password}`, {
          duration: 10000,
        })
      }

      // Reset form
      setFormData({ first_name: "", last_name: "", email: "", password: "" })
      setSpecialties([])
      setAutoGeneratePassword(false)
      setIsPrincipal(false)

      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el asesor")
    } finally {
      setIsSubmitting(false)
      toast.dismiss(toastId)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Alta de Asesores</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crea nuevos asesores en tu despacho y configura sus permisos.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Formulario de Registro</CardTitle>
          <CardDescription>
            Completa los datos para crear un nuevo asesor. La contraseña es opcional; si no la incluyes, se generará automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre y Apellidos */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre *</Label>
                <Input
                  id="first_name"
                  placeholder="Juan"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos *</Label>
                <Input
                  id="last_name"
                  placeholder="Pérez García"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan.perez@consultoritas.es"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Especialidades */}
            <div className="space-y-3">
              <Label>Especialidades</Label>
              <div className="flex flex-wrap gap-3">
                {SPECIALTY_OPTIONS.map((option) => {
                  const active = specialties.includes(option.id)
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className={cn("gap-2 rounded-full px-5 transition-all", active && "ring-2 ring-primary/20 shadow-md")}
                      onClick={() =>
                        setSpecialties((prev) =>
                          prev.includes(option.id)
                            ? prev.filter((i) => i !== option.id)
                            : [...prev, option.id]
                        )
                      }
                      disabled={isSubmitting}
                    >
                      <option.icon className={cn("size-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
                      {option.label}
                      {active && (
                        <Badge className="ml-1 bg-background/20 hover:bg-background/20 text-current border-none">
                          Activa
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={isSubmitting || autoGeneratePassword}
              />
              <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                <Checkbox
                  id="autoGen"
                  checked={autoGeneratePassword}
                  onCheckedChange={(checked) => handlePasswordToggle(checked as boolean)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="autoGen" className="text-sm cursor-pointer font-normal">
                  Generar automáticamente y enviar correo de bienvenida
                </Label>
              </div>
            </div>

            {/* Asesor Principal */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Checkbox
                id="isPrincipal"
                checked={isPrincipal}
                onCheckedChange={(checked) => setIsPrincipal(checked as boolean)}
                disabled={isSubmitting}
              />
              <Label htmlFor="isPrincipal" className="text-sm cursor-pointer font-normal">
                ¿Hacer a este usuario Asesor Principal?
              </Label>
            </div>

            {/* Botón Submit */}
            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando asesor...
                </>
              ) : (
                "Crear Asesor"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
