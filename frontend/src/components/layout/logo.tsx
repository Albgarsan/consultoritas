"use client"

import Image from "next/image"

interface ConsultoritasLogoProps {
  variant?: "full" | "icon" | "sidebar" | "header"
  className?: string
}

export function ConsultoritasLogo({ variant = "full", className = "" }: ConsultoritasLogoProps) {
  const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-yBAYw8j6FOMym8NO9yz68fi27JOZCI.png"

  if (variant === "icon") {
    return (
      <div className={`relative h-10 w-10 overflow-hidden rounded-full ${className}`}>
        <Image
          src={logoUrl}
          alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain object-top"
        />
      </div>
    )
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative h-9 w-9 overflow-hidden rounded-full">
          <Image
            src={logoUrl}
            alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain object-top"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-wide text-sidebar-foreground">
            CONSULTORITAS
          </span>
          <span className="text-[10px] tracking-wider text-blue-700">
            ASESORES DE NEGOCIO
          </span>
        </div>
      </div>
    )
  }

  if (variant === "header") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative h-10 w-10 overflow-hidden rounded-full">
          <Image
            src={logoUrl}
            alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain object-top"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-wide text-foreground">
            CONSULTORITAS
          </span>
          <span className="text-[9px] tracking-wider text-blue-700">
            ASESORES DE NEGOCIO
          </span>
        </div>
      </div>
    )
  }

  // Full logo variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-11 w-11 overflow-hidden rounded-full">
        <Image
          src={logoUrl}
          alt="Consultoritas"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain object-top"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold tracking-wide text-[#173d77]">
          CONSULTORITAS
        </span>
        <span className="text-[10px] tracking-wider text-blue-700">
          ASESORES DE NEGOCIO
        </span>
      </div>
    </div>
  )
}
