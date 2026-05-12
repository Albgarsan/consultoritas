"use client"

import { useState, useRef, useEffect } from "react"
import type { KeyboardEvent } from "react"
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

const initialMessages: Message[] = []

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
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Este chat todavía no está conectado a una fuente de datos real.",
        timestamp: new Date(),
      },
    ])
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
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
          Conector pendiente de integrar con la base de conocimiento
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

            {messages.length === 0 && !isTyping && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Sin conversación previa sincronizada.
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
              disabled={!input.trim()}
              className="shrink-0 bg-primary hover:bg-primary/90"
              aria-label="Enviar mensaje al asistente"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
