"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { serviceDetails } from "@/lib/constants/services"

interface ServicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceTitle: string | null
}

export function ServicesModal({ open, onOpenChange, serviceTitle }: ServicesModalProps) {
  const details = serviceTitle ? serviceDetails[serviceTitle] : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#173d77]">{serviceTitle}</DialogTitle>
          <DialogDescription>Detalles de nuestros servicios</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <ul className="space-y-3">
            {details?.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#173d77]" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
