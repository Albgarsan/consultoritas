"use client"

import Image from "next/image"

interface ConsultoritasLogoProps {
  variant?: "full" | "icon" | "sidebar" | "header"
  className?: string
  lightText?: boolean
}

export function ConsultoritasLogo({ variant = "full", className = "", lightText = false }: ConsultoritasLogoProps) {
  const logoUrl = "/logo.png"

  if (variant === "icon") {
    return (
      <div className={`relative h-12 w-20 overflow-hidden ${className}`}>
        <Image
          src={logoUrl}
          alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain"
        />
      </div>
    )
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative h-12 w-24 overflow-hidden">
          <Image
            src={logoUrl}
            alt="Consultoritas"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wide text-sidebar-foreground">
            CONSULTORITAS
          </span>
          <span className="text-[10px] tracking-wider text-blue-500">
            ASESORES DE NEGOCIO
          </span>
        </div>
      </div>
    )
  }

  if (variant === "header") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative h-14 w-32 overflow-hidden">
          <Image
            src={logoUrl}
            alt="Consultoritas"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
          />
        </div>
        <div className="flex flex-col items-start">
          <span className={`text-base font-bold tracking-wide ${lightText ? 'text-white' : 'text-slate-900'}`}>
            CONSULTORITAS
          </span>
          <span className={`text-[9px] tracking-wider ${lightText ? 'text-sky-200' : 'text-[#173d77]'}`}>
            ASESORES DE NEGOCIO
          </span>
        </div>
      </div>
    )
  }

  // Full logo variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-16 w-40 overflow-hidden">
        <Image
          src={logoUrl}
          alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain"
        />
      </div>
    </div>
  )
}
