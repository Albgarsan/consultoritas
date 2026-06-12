"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetch, parseBackendError } from "@/lib/api"
import { ChatUI, type AIChatMessage } from "./chat-ui"

const CLIENT_PROMPTS = [
  "Resumen de mis facturas",
  "¿Tengo citas próximas?",
  "Explícame mis gastos",
]

type ChatResponse = {
  conversation_id: string
  reply: string
  status?: "ok" | "human_typing"
}

type MessageResponse = {
  id: string
  conversation: string
  role: "User" | "Assistant"
  content: string
  sent_at: string
}

function extractArrayData(rawData: any): any[] {
  if (Array.isArray(rawData)) return rawData;
  if (rawData && typeof rawData === "object" && Array.isArray(rawData.results)) return rawData.results;
  return [];
}

export function ClientChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showGreetingBubble, setShowGreetingBubble] = useState(true)
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackNotes, setFeedbackNotes] = useState("")
  const [isSendingFeedback, setIsSendingFeedback] = useState(false)
  const [isAwaitingAdvisor, setIsAwaitingAdvisor] = useState(false)
  const pollingRef = useRef<number | null>(null)

  const syncConversationMessages = async (targetConversationId: string) => {
    const response = await apiFetch(`/api/ai/messages/?conversation=${targetConversationId}`)
    if (!response.ok) {
      return
    }

    const rawData = await response.json()
    const dataArray = extractArrayData(rawData) as MessageResponse[]

    const normalized = dataArray
      .slice()
      .sort((left, right) => new Date(left.sent_at).getTime() - new Date(right.sent_at).getTime())
      .map<AIChatMessage>((message) => ({
        id: message.id,
        role: message.role === "User" ? "user" : "assistant",
        content: message.content,
      }))

    setMessages(normalized)

    const hasAssistantReply = normalized.some((message) => message.role === "assistant")
    if (hasAssistantReply) {
      setIsAwaitingAdvisor(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !conversationId) {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    void syncConversationMessages(conversationId)
    pollingRef.current = window.setInterval(() => {
      void syncConversationMessages(conversationId)
    }, 5000)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [conversationId, isOpen])

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || isLoading) return

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ])
    setDraft("")
    setIsLoading(true)

    try {
      const response = await apiFetch("/api/ai/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: text,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo procesar el mensaje")
      }

      const data = (await response.json()) as ChatResponse
      setConversationId(data.conversation_id)

      if (data.status === "human_typing") {
        setIsAwaitingAdvisor(true)
        if (conversationId !== data.conversation_id) {
          void syncConversationMessages(data.conversation_id)
        }
      } else {
        setIsAwaitingAdvisor(false)
        setMessages((current) => [
          ...current,
          { id: `assistant-${Date.now()}`, role: "assistant", content: data.reply },
        ])
      }
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "Error enviando el mensaje")
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "No he podido responder ahora mismo. Inténtalo de nuevo en unos segundos.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const sendPrompt = async (prompt: string) => {
    await sendMessage(prompt)
  }

  const submitFeedback = async () => {
    if (!conversationId) {
      toast.error("Inicia una conversación antes de enviar feedback")
      return
    }
    if (!feedbackRating) {
      toast.error("Selecciona una valoración")
      return
    }

    setIsSendingFeedback(true)
    try {
      const response = await apiFetch(`/api/ai/chat/${conversationId}/feedback/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: feedbackRating,
          has_incident: Boolean(feedbackNotes.trim()),
          incident_notes: feedbackNotes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo enviar feedback")
      }

      toast.success("Gracias por tu valoración")
      setFeedbackOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? parseBackendError(error.message) : "No se pudo enviar feedback")
    } finally {
      setIsSendingFeedback(false)
    }
  }

  return (
    <ChatUI
      title="Asistente Consultoritas"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      showGreetingBubble={showGreetingBubble}
      setShowGreetingBubble={setShowGreetingBubble}
      messages={messages}
      draft={draft}
      setDraft={setDraft}
      suggestedPrompts={CLIENT_PROMPTS}
      onSendMessage={sendMessage}
      onPromptClick={sendPrompt}
      feedbackEnabled={Boolean(conversationId)}
      feedbackOpen={feedbackOpen}
      setFeedbackOpen={setFeedbackOpen}
      feedbackRating={feedbackRating}
      setFeedbackRating={setFeedbackRating}
      feedbackNotes={feedbackNotes}
      setFeedbackNotes={setFeedbackNotes}
      isSendingFeedback={isSendingFeedback}
      onSubmitFeedback={submitFeedback}
      isLoading={isLoading || isAwaitingAdvisor}
      loadingLabel={isAwaitingAdvisor ? "Esperando respuesta del asesor..." : "Escribiendo..."}
      footerNote="Tus mensajes pueden ser revisados por un asesor humano para gestionar tu consulta conforme al RGPD."
    />
  )
}
