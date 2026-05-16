"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConsultoritasLogo } from "@/components/layout/logo"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await apiFetch("/api/users/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          password: password,
        }),
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
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col"
    >
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> Volver
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center pt-8">
            <div className="flex justify-center mb-6">
              <ConsultoritasLogo variant="full" />
            </div>
            <h1 className="text-2xl font-bold">Acceso al Portal</h1>
            <p className="text-muted-foreground text-sm">Introduce tus credenciales para continuar</p>
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email</Label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-muted/30"
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
                    className="bg-muted/30 pr-10"
                    maxLength={128}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button type="button" className="text-primary hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-bold mt-4 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Accediendo..." : "Entrar al Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
