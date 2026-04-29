"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, User, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConsultoritasLogo } from "@/components/layout/logo"
import { cn } from "@/lib/utils"

type UserType = "client" | "advisor"

const userTypes = [
  {
    id: "client" as UserType,
    title: "Cliente",
    icon: User,
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/50",
  },
  {
    id: "advisor" as UserType,
    title: "Asesor",
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/50",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserType) return

    setIsLoading(true)
    setTimeout(() => {
      router.push(selectedUserType === "client" ? "/cliente" : "/asesor")
      setIsLoading(false)
    }, 600)
  }

  const handleQuickLogin = (type: UserType) => {
    setIsLoading(true)
    setTimeout(() => {
      router.push(type === "client" ? "/cliente" : "/asesor")
      setIsLoading(false)
    }, 400)
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
          </CardHeader>

          <CardContent className="pt-6 pb-8 px-8">
            {/* Selección de Tipo de Usuario (Solo 2 opciones ahora) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {userTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedUserType(type.id)}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl border-2 transition-all",
                    selectedUserType === type.id
                      ? `${type.borderColor} ${type.bgColor}`
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className={cn("p-3 rounded-full mb-2", type.bgColor)}>
                    <type.icon className={cn("size-6", type.color)} />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-tighter text-foreground">
                    {type.title}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Usuario / Email</Label>
                <Input
                  id="identifier"
                  placeholder={selectedUserType === "client" ? "Tu NIF o Email" : "nombre@consultoritas.es"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="bg-muted/30"
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
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoading || !selectedUserType}
              >
                {isLoading ? "Cargando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border flex flex-col gap-2">
               <p className="text-center text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2">Acceso Rápido</p>
               <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleQuickLogin("client")} className="text-xs">
                    Test Cliente
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleQuickLogin("advisor")} className="text-xs">
                    Test Asesor
                  </Button>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
