"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConsultoritasLogo } from "@/components/layout/logo"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [isRecovering, setIsRecovering] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await apiFetch("/api/users/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      })

      if (res.ok) {
        const data = await res.json()
        document.cookie = "consultoritas_role=; Path=/; Max-Age=0; SameSite=Lax"
        document.cookie = `consultoritas_role=${encodeURIComponent(String(data.role || ""))}; Path=/; Max-Age=28800; SameSite=Lax`
        if (data.role === "Asesor" || data.role === "admin") {
          router.push("/asesor")
        } else {
          router.push("/cliente")
        }
        toast.success("Bienvenido de nuevo")
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error("Credenciales incorrectas")
        console.error("Error de login:", errorData)
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor")
      console.error("Error de red:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/40"
    >
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="gap-2 text-slate-500 hover:bg-[#173d77]/5 hover:text-[#173d77]"
        >
          <ArrowLeft className="size-4" /> Volver
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(23,61,119,0.35)]">
          <div className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#173d77] via-sky-500 to-[#173d77]" />
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative hidden overflow-hidden bg-[#173d77] p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
              <div className="relative z-10 space-y-8">
                <ConsultoritasLogo variant="full" />
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-100">Acceso Privado</p>
                  <h1 className="text-4xl font-light tracking-tight">Portal de trabajo para clientes y asesores.</h1>
                  <p className="max-w-md text-sm leading-6 text-slate-200">
                    Entra con tus credenciales para consultar documentación, gestionar citas y continuar la relación de trabajo.
                  </p>
                </div>
              </div>
              <div className="relative z-10 text-xs uppercase tracking-[0.25em] text-slate-300">
                Consultoritas Asesores de Negocio
              </div>
            </div>

            <div className="p-8 sm:p-10 lg:p-12">
              <div className="text-center">
                <div className="mb-6 flex justify-center lg:hidden">
                  <ConsultoritasLogo variant="full" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acceso al Portal</h1>
                <p className="text-sm text-slate-500">Introduce tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email</Label>
                  <Input
                    id="identifier"
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="border-slate-200 bg-slate-50 focus-visible:ring-[#173d77]"
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-slate-200 bg-slate-50 pr-10 focus-visible:ring-[#173d77]"
                      maxLength={128}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#173d77]"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="font-medium text-[#173d77] hover:underline">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(23,61,119,0.35)]">
                      <div className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#173d77] via-sky-500 to-[#173d77]" />
                      <DialogHeader>
                        <DialogTitle className="text-[#173d77]">Recuperar Contraseña</DialogTitle>
                        <DialogDescription className="text-slate-500">
                          Introduce tu correo electrónico registrado y te enviaremos una contraseña temporal segura.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIsRecovering(true)

                          try {
                            const res = await apiFetch("/api/users/recover_password/", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase() }),
                            })

                            if (!res.ok) {
                              const errorData = await res.json().catch(() => ({}))
                              throw new Error(errorData.detail || "Error al procesar la solicitud.")
                            }

                            await res.json()
                            setRecoveryEmail("")
                            setIsRecoveryOpen(false)
                            toast.success("Se ha enviado una contraseña temporal a tu correo.")
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Error al recuperar la contraseña.")
                          } finally {
                            setIsRecovering(false)
                          }
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="recovery-email">Correo Electrónico</Label>
                          <Input
                            id="recovery-email"
                            type="email"
                            placeholder="ejemplo@gmail.com"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            disabled={isRecovering}
                            className="border-slate-200 bg-slate-50 focus-visible:ring-[#173d77]"
                            required
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsRecoveryOpen(false)}
                            disabled={isRecovering}
                            className="border-slate-200 text-slate-600 hover:bg-[#173d77]/5 hover:text-[#173d77]"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={isRecovering || !recoveryEmail.trim()}
                            className="gap-2 bg-[#173d77] text-white shadow-[0_16px_36px_-18px_rgba(23,61,119,0.45)] hover:bg-[#204b8f]"
                          >
                            {isRecovering ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              "Restablecer Contraseña"
                            )}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Button
                  type="submit"
                  className="mt-4 h-11 w-full bg-[#173d77] text-base font-bold text-white shadow-[0_16px_36px_-18px_rgba(23,61,119,0.45)] hover:bg-[#204b8f]"
                  disabled={isLoading}
                >
                  {isLoading ? "Accediendo..." : "Entrar al Portal"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
