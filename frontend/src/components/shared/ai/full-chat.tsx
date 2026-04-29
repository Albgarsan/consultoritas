"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const starterPrompts = [
  "¿Cuánto IVA tengo que pagar este trimestre?",
  "Resume mi última factura subida",
  "¿Tengo algún impuesto pendiente de firma?",
]

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hola María, soy tu Consultor IA Premium. Tengo acceso a todos tus documentos y datos fiscales. ¿En qué puedo ayudarte hoy?",
    timestamp: new Date(),
  },
]

export function PremiumAIChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const getResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes("iva") && lowerQuery.includes("trimestre")) {
      return "He analizado tus facturas del Q1 2026. Tu IVA repercutido es de 4.850,00€ y el IVA soportado deducible es de 1.604,20€. El resultado a pagar en la declaración del modelo 303 será de **3.245,80€**. El plazo de presentación termina el 20 de abril. ¿Quieres que prepare el borrador?"
    }

    if (lowerQuery.includes("factura") && (lowerQuery.includes("última") || lowerQuery.includes("ultima"))) {
      return "Tu última factura subida es la **Factura #2024-089** de Servicios Digitales S.L., fechada el 12/03/2026 por importe de 1.250,00€ + IVA (262,50€). Concepto: \"Desarrollo web - Fase 2\". El documento ha sido procesado correctamente y clasificado como ingreso de actividad profesional. ¿Necesitas más detalles?"
    }

    if (lowerQuery.includes("pendiente") && lowerQuery.includes("firma")) {
      return "Tienes **2 impuestos pendientes de tu firma** para su presentación:\n\n1. **Modelo 130** (Pago fraccionado IRPF) - Q1 2026 - Importe: 1.890,45€\n2. **Modelo 303** (IVA Trimestral) - Q1 2026 - Importe: 3.245,80€\n\nAmbos tienen como fecha límite el 20 de abril. ¿Quieres que te envíe los borradores para revisión?"
    }

    if (lowerQuery.includes("gasto") || lowerQuery.includes("deducible")) {
      return "Este trimestre has registrado gastos deducibles por un total de **7.640,00€**. Los principales conceptos son: Suministros (380€), Material de oficina (245€), Servicios profesionales (4.200€), Software y herramientas (1.815€), y Dietas y desplazamientos (1.000€). Todos los gastos están correctamente documentados."
    }

    return "He revisado tu consulta. Para darte una respuesta precisa, necesitaría que me especifiques un poco más. ¿Se trata de tus impuestos trimestrales, algún documento específico, o tienes dudas sobre deducciones?"
  }

  const handleSend = (message?: string) => {
    const messageToSend = message || input
    if (!messageToSend.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getResponse(messageToSend),
        timestamp: new Date(),
      }

      setIsTyping(false)
      setMessages((prev) => [...prev, assistantMessage])
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary to-accent text-primary-foreground pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5" />
          Consultor IA Premium
        </CardTitle>
        <p className="text-sm text-primary-foreground/80">
          Analizando tus documentos en tiempo real
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {/* Messages */}
        <ScrollArea className="h-72 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                      <Sparkles className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      MC
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Starter Prompts */}
            {messages.length === 1 && !isTyping && (
              <div className="space-y-2 pt-2">
                {starterPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(prompt)}
                    className="block w-full text-left text-sm px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Pregunta sobre tus impuestos..."
              className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="shrink-0 bg-primary hover:bg-primary/90"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
