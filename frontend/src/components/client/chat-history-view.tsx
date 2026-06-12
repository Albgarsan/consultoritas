"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { CalendarClock, Search, MessageSquare } from "lucide-react"
import { apiFetch, parseBackendError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  title?: string | null
  created_at: string
}

type Message = {
  id: string
  role: "User" | "Assistant"
  content: string
  sent_at: string
}

function extractArrayData(rawData: any): any[] {
  if (Array.isArray(rawData)) return rawData;
  if (rawData && typeof rawData === "object" && Array.isArray(rawData.results)) return rawData.results;
  return [];
}

function formatDate(value: string) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return "Invalid date"
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function ChatHistoryView() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const loadMessagesRequestIdRef = useRef(0)

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    try {
      const response = await apiFetch("/api/ai/conversations/")
      if (!response.ok) {
        throw new Error("No se pudieron cargar las conversaciones")
      }

      const rawData = await response.json()
      const dataArray = extractArrayData(rawData) as Conversation[]

      // Ordenamos las conversaciones de más reciente a más antigua
      const sortedConversations = dataArray.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setConversations(sortedConversations)
      setSelectedConversationId((current) => current || sortedConversations[0]?.id || null)
      return sortedConversations
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudieron cargar las conversaciones")
      return []
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true)
    const requestId = ++loadMessagesRequestIdRef.current
    try {
      const response = await apiFetch(`/api/ai/messages/?conversation=${conversationId}`)
      if (requestId !== loadMessagesRequestIdRef.current) return

      if (!response.ok) {
        throw new Error("No se pudo cargar el historial")
      }

      const rawData = await response.json()
      if (requestId !== loadMessagesRequestIdRef.current) return

      const dataArray = extractArrayData(rawData) as Message[]
      setMessages(
        dataArray
          .slice()
          .sort((left, right) => new Date(left.sent_at).getTime() - new Date(right.sent_at).getTime()),
      )
    } catch (error) {
      if (requestId !== loadMessagesRequestIdRef.current) return
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudo cargar el historial")
      setMessages([])
    } finally {
      if (requestId === loadMessagesRequestIdRef.current) {
        setIsLoadingMessages(false)
      }
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([])
      return
    }
    void loadMessages(selectedConversationId)
  }, [selectedConversationId])

  const filteredConversations = conversations.filter((conversation) => {
    const label = conversation.title || conversation.id
    return label.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-primary" />
            Mis Consultas
          </CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar chat..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[640px] pr-3">
            <div className="space-y-2">
              {isLoadingConversations ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">Cargando conversaciones...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No hay conversaciones guardadas.</div>
              ) : (
                filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                        active && "border-primary/40 bg-primary/5 shadow-sm",
                      )}
                    >
                      <div className="space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {conversation.title || `Conversación ${conversation.id.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarClock className="size-3.5" />
                          <span>{formatDate(conversation.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {selectedConversation ? selectedConversation.title || "Historial de conversación" : "Selecciona un chat"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[700px] rounded-2xl border bg-background/60 p-4">
            {isLoadingMessages ? (
              <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">Cargando mensajes...</div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">No hay mensajes para mostrar.</div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "User" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "User"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide opacity-70">
                        <span>{message.role === "User" ? "Usuario" : "Asistente"}</span>
                        <span>{formatDate(message.sent_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatHistoryView
