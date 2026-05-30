"use client"

import { useEffect, useRef, useState } from "react"
import {
  Calculator, Gavel, Loader2, Save, Scale,
  Briefcase, User, Clock, Lock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

const SPECIALTY_OPTIONS = [
  { id: "contable", label: "Contable", icon: Scale },
  { id: "laboral", label: "Laboral", icon: Briefcase },
  { id: "judicial", label: "Jurídica", icon: Gavel },
  { id: "fiscal", label: "Fiscal", icon: Calculator },
]

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
] as const

type Slot = { start: string; end: string }
type DaySchedule = { enabled: boolean; slots: Slot[] }
type WorkSchedule = Record<string, DaySchedule>
type RawScheduleEntry = { enabled?: unknown; slots?: unknown }

function toMinutes(value: string) {
  const [h, m] = value.split(":").map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

function normalizeSchedule(input: unknown): WorkSchedule {
  const empty: WorkSchedule = {}
  for (const day of DAYS) {
    empty[day.key] = { enabled: true, slots: [{ start: "08:00", end: "18:00" }] }
  }

  if (!input || typeof input !== "object") return empty
  const raw = input as Record<string, RawScheduleEntry>

  for (const day of DAYS) {
    const cfg = raw[day.key]
    if (!cfg || typeof cfg !== "object") continue
    const enabled = typeof cfg.enabled === "boolean" ? cfg.enabled : true
    const slots = Array.isArray(cfg.slots)
      ? cfg.slots
          .filter((s): s is Slot => {
            if (!s || typeof s !== "object") return false
            const candidate = s as { start?: unknown; end?: unknown }
            return typeof candidate.start === "string" && typeof candidate.end === "string"
          })
          .slice(0, 2)
      : []
    empty[day.key] = {
      enabled,
      slots: slots.length > 0 ? slots : [{ start: "08:00", end: "18:00" }],
    }
  }

  return empty
}

export function AdvisorSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Estados para datos reales (Backend)
  const [userData, setUserData] = useState({ first_name: "", last_name: "", email: "", work_start: "", work_end: "", profile_image: "", is_on_vacation: false })
  const [specialties, setSpecialties] = useState<string[]>([])
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(() => normalizeSchedule(null))
  const [passwordData, setPasswordData] = useState({ current_password: "", new_password: "", confirm_password: "" })

  // Carga inicial del perfil
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await apiFetch("/api/users/me/")
        if (!response.ok) throw new Error()
        const data = await response.json()
        setUserData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          work_start: data.work_start || "",
          work_end: data.work_end || "",
          profile_image: data.profile_image || "",
          is_on_vacation: Boolean(data.is_on_vacation),
        })
        setWorkSchedule(normalizeSchedule(data.work_schedule))
        setSpecialties(Array.isArray(data.specialties) ? data.specialties : [])
      } catch {
        toast.error("Error al conectar con el servidor")
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    for (const day of DAYS) {
      const cfg = workSchedule[day.key]
      if (!cfg || !cfg.enabled) continue
      if (!cfg.slots.length) {
        toast.error(`Define al menos una franja para ${day.label}`)
        return
      }
      for (let i = 0; i < cfg.slots.length; i += 1) {
        const slot = cfg.slots[i]
        const s = toMinutes(slot.start)
        const e = toMinutes(slot.end)
        if (s < 0 || e < 0) {
          toast.error(`Formato de hora invalido en ${day.label}`)
          return
        }
        if (e <= s) {
          toast.error(`La salida debe ser posterior a la entrada en ${day.label}`)
          return
        }
        if (i > 0) {
          const prev = cfg.slots[i - 1]
          if (toMinutes(slot.start) < toMinutes(prev.end)) {
            toast.error(`La segunda entrada no puede ser antes de la primera salida en ${day.label}`)
            return
          }
        }
      }
    }

    setIsSaving(true)
    try {
      const mondaySlots = workSchedule.monday?.slots || []
      const firstSlot = mondaySlots[0] || { start: userData.work_start || "08:00", end: userData.work_end || "18:00" }

      const response = await apiFetch("/api/users/me/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: userData.first_name,
          last_name: userData.last_name,
          specialties,
          work_start: firstSlot.start || null,
          work_end: firstSlot.end || null,
          work_schedule: workSchedule,
          is_on_vacation: userData.is_on_vacation,
        }),
      })
      if (!response.ok) throw new Error()
      const updated = await response.json().catch(() => null)
      if (updated) {
        setUserData((cur) => ({
          ...cur,
          work_start: updated.work_start || "",
          work_end: updated.work_end || "",
          is_on_vacation: Boolean(updated.is_on_vacation),
        }))
        setWorkSchedule(normalizeSchedule(updated.work_schedule))
      }
      toast.success("Perfil y especialidades actualizados")
    } catch {
      toast.error("Error al guardar los cambios")
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
        const message = errorData.current_password || errorData.new_password || errorData.confirm_password || errorData.detail || "No se pudo cambiar la contraseña"
        throw new Error(Array.isArray(message) ? message[0] : message)
      }

      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      toast.success("Contraseña actualizada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png"]
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG o PNG")
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error("La imagen no debe superar 5MB")
      return
    }

    const formData = new FormData()
    formData.append("profile_image", file)

    try {
      const response = await apiFetch("/api/users/me/", {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        // Handle common server-side size limit
        if (response.status === 413) {
          throw new Error("El archivo es demasiado grande para el servidor (límite del servidor).")
        }

        // Try parse JSON error body, otherwise fallback to text/status
        let message: string | null = null
        try {
          const errorData = await response.json()
          message = errorData?.detail || errorData?.profile_image || (typeof errorData === "string" ? errorData : JSON.stringify(errorData))
        } catch {
          const text = await response.text().catch(() => "")
          message = text || response.statusText || null
        }

        throw new Error(message || "No se pudo subir la imagen")
      }

      const updated = await response.json().catch(() => null)
      if (updated) {
        setUserData((current) => ({
          ...current,
          profile_image: updated.profile_image || current.profile_image,
        }))
      }
      toast.success("Imagen actualizada correctamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen"
      toast.error(message)
    }
  }

  if (isLoading) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* CABECERA Y BOTÓN GUARDAR */}
      <div className="flex justify-between items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Mi Perfil Profesional</h2>
          <p className="text-muted-foreground text-sm">Gestiona tu información pública, especialidades y disponibilidad de citas.</p>
        </div>
        <Button className="gap-2 bg-primary shadow-lg hover:shadow-primary/20" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar Todo
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-2"><User className="size-4" /> Perfil</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Clock className="size-4" /> Horario de Citas</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA PERFIL Y ESPECIALIDADES --- */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in-50 duration-300">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="size-20 rounded-[2rem] bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : userData.profile_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userData.profile_image} alt="Foto de perfil" className="h-full w-full object-cover" />
                  ) : (
                    <User className="size-6 text-slate-400" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={async (e) => {
                    const inputEl = e.currentTarget
                    const file = inputEl.files?.[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      setPreviewUrl(url)
                      try {
                        await handleImageUpload(file)
                      } finally {
                        // Keep the preview visible after upload; it will be replaced on next selection or refresh.
                      }
                    }
                    inputEl.value = ""
                  }}
                />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">Información Pública</CardTitle>
                <CardDescription>Estos datos se muestran en la Landing Page y buscador de asesores.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={userData.first_name}
                  onChange={(e) => setUserData({...userData, first_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input
                  id="last_name"
                  value={userData.last_name}
                  onChange={(e) => setUserData({...userData, last_name: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email de Contacto (No editable)</Label>
                <Input value={userData.email} disabled className="bg-muted/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                <CardTitle className="text-lg">Seguridad</CardTitle>
              </div>
              <CardDescription>Cambia tu contraseña cuando lo necesites.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 pt-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Contraseña actual</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData((current) => ({ ...current, current_password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Nueva contraseña</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData((current) => ({ ...current, new_password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData((current) => ({ ...current, confirm_password: e.target.value }))}
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

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scale className="size-5 text-primary" />
                <CardTitle className="text-lg">Mis Especialidades</CardTitle>
              </div>
              <CardDescription>Activa las áreas en las que el cliente podrá encontrarte para reservar cita.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {SPECIALTY_OPTIONS.map((option) => {
                const active = specialties.includes(option.id)
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant={active ? "default" : "outline"}
                    className={cn("gap-2 rounded-full px-5 transition-all", active && "ring-2 ring-primary/20 shadow-md")}
                    onClick={() => setSpecialties(prev => prev.includes(option.id) ? prev.filter(i => i !== option.id) : [...prev, option.id])}
                  >
                    <option.icon className={cn("size-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
                    {option.label}
                    {active && <Badge className="ml-1 bg-background/20 hover:bg-background/20 text-current border-none">Activa</Badge>}
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA HORARIO (RECUPERADA) --- */}
        <TabsContent value="schedule" className="space-y-6 animate-in fade-in-50 duration-300">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Disponibilidad</CardTitle>
              <CardDescription>Define una franja principal por dia y, si lo necesitas, una segunda franja extra.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid gap-4">
                {DAYS.map((day) => {
                  const cfg = workSchedule[day.key]
                  const slots = cfg?.slots || []
                  const hasSecond = slots.length > 1
                  return (
                    <div key={day.key} className="rounded-xl border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">{day.label}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Disponible</span>
                          <Switch
                            checked={cfg?.enabled ?? true}
                            onCheckedChange={(checked) => {
                              setWorkSchedule((prev) => ({
                                ...prev,
                                [day.key]: {
                                  ...prev[day.key],
                                  enabled: checked,
                                },
                              }))
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="time"
                          className="w-28"
                          disabled={!(cfg?.enabled ?? true)}
                          value={slots[0]?.start || "08:00"}
                          onChange={(e) => {
                            const value = e.target.value
                            setWorkSchedule((prev) => {
                              const nextSlots = [...(prev[day.key]?.slots || [{ start: "08:00", end: "18:00" }])]
                              nextSlots[0] = { ...(nextSlots[0] || { start: "08:00", end: "18:00" }), start: value }
                              return { ...prev, [day.key]: { ...(prev[day.key] || { enabled: true, slots: [] }), slots: nextSlots } }
                            })
                          }}
                        />

                        {!hasSecond ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!(cfg?.enabled ?? true)}
                            onClick={() => {
                              setWorkSchedule((prev) => {
                                const first = (prev[day.key]?.slots || [{ start: "08:00", end: "18:00" }])[0]
                                return {
                                  ...prev,
                                  [day.key]: {
                                    ...(prev[day.key] || { enabled: true, slots: [] }),
                                    slots: [first, { start: first.end || "16:00", end: "18:00" }],
                                  },
                                }
                              })
                            }}
                          >
                            Anadir franja
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!(cfg?.enabled ?? true)}
                            onClick={() => {
                              setWorkSchedule((prev) => ({
                                ...prev,
                                [day.key]: {
                                  ...(prev[day.key] || { enabled: true, slots: [] }),
                                  slots: [prev[day.key].slots[0]],
                                },
                              }))
                            }}
                          >
                            Quitar franja extra
                          </Button>
                        )}
                      </div>

                      {hasSecond && (
                        <div className="flex flex-wrap items-center gap-2 pl-1">
                          <Input
                            type="time"
                            className="w-28"
                            disabled={!(cfg?.enabled ?? true)}
                            value={slots[1].start}
                            onChange={(e) => {
                              const value = e.target.value
                              setWorkSchedule((prev) => {
                                const nextSlots = [...(prev[day.key]?.slots || [])]
                                nextSlots[1] = { ...(nextSlots[1] || { start: "16:00", end: "18:00" }), start: value }
                                return { ...prev, [day.key]: { ...(prev[day.key] || { enabled: true, slots: [] }), slots: nextSlots } }
                              })
                            }}
                          />
                          <span className="text-muted-foreground text-xs uppercase font-medium">a</span>
                          <Input
                            type="time"
                            className="w-28"
                            disabled={!(cfg?.enabled ?? true)}
                            value={slots[1].end}
                            onChange={(e) => {
                              const value = e.target.value
                              setWorkSchedule((prev) => {
                                const nextSlots = [...(prev[day.key]?.slots || [])]
                                nextSlots[1] = { ...(nextSlots[1] || { start: "16:00", end: "18:00" }), end: value }
                                return { ...prev, [day.key]: { ...(prev[day.key] || { enabled: true, slots: [] }), slots: nextSlots } }
                              })
                            }}
                          />
                          <span className="text-xs text-muted-foreground">Franja extra</span>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                  Validaciones: la salida debe ser posterior a la entrada, y la segunda franja no puede solaparse con la primera.
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-accent/20 bg-accent/5">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">Modo Vacaciones</p>
                  <p className="text-xs text-muted-foreground">Desactivar temporalmente el calendario de reservas.</p>
                </div>
                <Switch
                  checked={userData.is_on_vacation}
                  onCheckedChange={(checked) => setUserData((current) => ({ ...current, is_on_vacation: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
