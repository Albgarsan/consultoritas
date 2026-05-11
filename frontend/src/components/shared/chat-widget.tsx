"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, User, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Chat disponible cuando se conecte el servicio de IA real." }
  ])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { role: "user", content: input }])
    setInput("")
    setMessages((prev) => [
      ...prev,
      { role: "ai", content: "Este chat todavía no está conectado a la base de conocimiento real." }
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
              className="rounded-full shadow-xl bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2 h-12 px-6"
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
            className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:w-[400px] h-[500px] bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
          >
            <header className="h-14 bg-primary text-primary-foreground flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="size-5" />
                <span className="font-semibold">Consultoritas IA</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </header>

            <ScrollArea className="flex-1 p-4 bg-muted/10 overflow-y-auto">
              <div className="space-y-4 pb-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary">
                          <Bot size={16} />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`rounded-2xl px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground rounded-tr-sm"
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
                  className="pr-12 rounded-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary"
                />
                <Button
                  size="icon"
                  className="absolute right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleSend}
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
