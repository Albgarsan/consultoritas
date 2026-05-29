"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ id: string; role: "user" | "ai"; content: string }[]>([
    { id: crypto.randomUUID(), role: "ai", content: "Chat disponible cuando se conecte el servicio de IA real." }
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: input }])
    setInput("")
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "ai", content: "Este chat todavía no está conectado a la base de conocimiento real." }
    ])
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="flex h-12 items-center gap-2 rounded-full bg-[#173d77] px-6 text-white shadow-[0_16px_36px_-18px_rgba(23,61,119,0.55)] hover:bg-[#204b8f]"
            >
              <MessageCircle className="size-5" />
              <span className="font-semibold">Hablar con IA</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[500px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-background shadow-2xl sm:w-[400px]"
          >
            <header className="flex h-14 shrink-0 items-center justify-between bg-[#173d77] px-4 text-white">
              <div className="flex items-center gap-2">
                <Bot className="size-5" />
                <span className="font-semibold">Consultoritas IA</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white hover:bg-white/10"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar chat"
              >
                <X className="size-4" />
              </Button>
            </header>

            <ScrollArea className="flex-1 p-4 bg-muted/10 overflow-y-auto">
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-[#173d77]/10 text-[#173d77]">
                          <Bot size={16} />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-[#173d77] text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 bg-background border-t shrink-0 flex-shrink-0">
              <div className="relative flex items-center">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Escribe tu duda..."
                  className="rounded-full border-transparent bg-muted/50 pr-12 focus-visible:ring-1 focus-visible:ring-[#173d77]"
                />
                <Button
                  size="icon"
                  disabled={!input.trim()}
                  className="absolute right-1 h-8 w-8 rounded-full bg-[#173d77] text-white hover:bg-[#204b8f] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleSend}
                  aria-label="Enviar mensaje"
                  aria-disabled={!input.trim()}
                >
                  <Send className="size-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
