"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Send, X, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hola, soy tu Consultor IA. Estoy aquí para ayudarte con cualquier duda sobre tus impuestos, documentos o situación fiscal. ¿En qué puedo asistirte hoy?",
    timestamp: new Date(),
  },
]

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
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

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "He revisado tu documentación fiscal. Para el IVA del primer trimestre, tienes un saldo a pagar de 3.245,80€. Recuerda que el plazo de presentación termina el 20 de abril.",
        "Según los documentos que has subido, tus gastos deducibles este trimestre son correctos. Te recomiendo guardar todas las facturas de suministros y material de oficina.",
        "Tu estimación de IRPF anual está basada en los ingresos declarados hasta ahora. Si tienes previsto algún cambio significativo en tu facturación, podemos ajustar las previsiones.",
        "He detectado una factura pendiente de clasificar. ¿Corresponde a un gasto de operaciones corrientes o a una inversión en activo fijo?",
      ]

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <Sparkles className="size-5" />
        <span className="font-medium">Consultor IA</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col bg-card border border-border/50 rounded-xl shadow-2xl transition-all overflow-hidden",
        isMinimized ? "w-72 h-14" : "w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Consultor IA Activo</span>
            {!isMinimized && (
              <span className="text-xs text-primary-foreground/80">
                Pregúntame sobre tus impuestos
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
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
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
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
                placeholder="Escribe tu consulta..."
                className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="shrink-0 bg-primary hover:bg-primary/90"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
