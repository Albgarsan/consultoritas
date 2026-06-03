"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apiFetch, parseBackendError } from "@/lib/api"
import { ChatUI, type AIChatMessage } from "./chat-ui"

const PUBLIC_PROMPTS = [
  "¿Qué servicios ofrecéis?",
  "¿Horarios?",
  "¿Cómo contrato?",
]

type ChatResponse = {
  conversation_id: string
  reply: string
}

export function PublicChatWidget() {
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

  // Extraemos el contexto de la web para el bot
  const [contextText, setContextText] = useState("")

  useEffect(() => {
      const mainContent = document.querySelector('main')?.innerText || document.body.innerText;
      setContextText(mainContent.slice(0, 4000));
  }, [])

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
          context_text: contextText
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || "No se pudo procesar el mensaje")
      }

      const data = (await response.json()) as ChatResponse
      setConversationId(data.conversation_id)
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", content: data.reply },
      ])
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
      title="Asistente Comercial Consultoritas"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      showGreetingBubble={showGreetingBubble}
      setShowGreetingBubble={setShowGreetingBubble}
      messages={messages}
      draft={draft}
      setDraft={setDraft}
      isLoading={isLoading}
      suggestedPrompts={PUBLIC_PROMPTS}
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
      loadingLabel="Escribiendo..."
    />
  )
}

export default PublicChatWidget
