"use client"

import { useState } from "react"
import { Upload, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DocumentUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setUploadedFiles(files.map(f => f.name))
    // Aquí iría la llamada a Gemini más adelante
    setTimeout(() => setUploadedFiles([]), 3000)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-all text-center",
        isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="size-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Arrastra tus documentos aquí</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Sube tus PDFs o imágenes. Gemini extraerá los datos automáticamente.
          </p>
        </div>
        <Button variant="outline">Seleccionar archivos</Button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-2">
            <Sparkles className="size-6 text-primary animate-pulse mx-auto" />
            <p className="font-medium">Procesando con IA...</p>
          </div>
        </div>
      )}
    </div>
  )
}
