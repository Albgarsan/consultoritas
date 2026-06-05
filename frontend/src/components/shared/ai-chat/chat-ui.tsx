"use client"

import { Bot, Loader2, Send, Star, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type AIChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type AIChatUIProps = {
  title?: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  showGreetingBubble: boolean
  setShowGreetingBubble: (visible: boolean) => void
  messages: AIChatMessage[]
  draft: string
  setDraft: (value: string) => void
  isLoading: boolean
  suggestedPrompts: string[]
  onSendMessage: (text: string) => Promise<void>
  onPromptClick: (prompt: string) => Promise<void>
  feedbackEnabled: boolean
  feedbackOpen: boolean
  setFeedbackOpen: (open: boolean) => void
  feedbackRating: number
  setFeedbackRating: (rating: number) => void
  feedbackNotes: string
  setFeedbackNotes: (notes: string) => void
  isSendingFeedback: boolean
  onSubmitFeedback: () => Promise<void>
  loadingLabel?: string
  footerNote?: string
}

function RatingStars({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => index + 1).map((star) => {
        const active = value >= star
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all",
              active
                ? "border-amber-300 bg-amber-50 text-amber-500 shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-amber-200 hover:bg-amber-50/60",
            )}
            aria-label={`Valorar con ${star} estrellas`}
          >
            <Star className={cn("size-4", active && "fill-current")} />
          </button>
        )
      })}
    </div>
  )
}

export function ChatUI({
  title = "Asistente Consultoritas",
  isOpen,
  setIsOpen,
  showGreetingBubble,
  setShowGreetingBubble,
  messages,
  draft,
  setDraft,
  isLoading,
  suggestedPrompts,
  onSendMessage,
  onPromptClick,
  feedbackEnabled,
  feedbackOpen,
  setFeedbackOpen,
  feedbackRating,
  setFeedbackRating,
  feedbackNotes,
  setFeedbackNotes,
  isSendingFeedback,
  onSubmitFeedback,
  loadingLabel = "Escribiendo...",
  footerNote,
}: AIChatUIProps) {
  return (
    <>
      {showGreetingBubble && !isOpen && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[250px] rounded-2xl border bg-background px-3 py-2 text-sm shadow-xl">
          <button
            type="button"
            aria-label="Cerrar sugerencia"
            onClick={() => setShowGreetingBubble(false)}
            className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground"
          >
            <X className="size-3" />
          </button>
          ¡Hola! ¿Te ayudo en algo?
        </div>
      )}

      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-0 shadow-2xl shadow-slate-950/30 ring-1 ring-white/10 transition-transform hover:scale-105"
        aria-label="Abrir asistente IA"
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? <X className="size-6 text-white" /> : <Bot className="size-6 text-white" />}
        </div>
      </Button>

      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-3 text-white">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
              <p className="mt-0.5 text-xs text-slate-300">Chat inteligente seguro</p>
            </div>

            <div className="flex items-center gap-1">
              <Popover open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 bg-white/10 text-white hover:bg-white/20 border-white/20"
                    disabled={!feedbackEnabled}
                    title="Valora tu experiencia con este chat"
                  >
                    <Star className="size-4" />
                    <span className="hidden sm:inline">Valora el chat</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={10} className="w-72 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Valorar experiencia</p>
                      <p className="text-xs text-muted-foreground">Tu opinión nos ayuda a mejorar. Reporta cualquier problema aquí.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Puntuación</Label>
                      <RatingStars value={feedbackRating} onChange={setFeedbackRating} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-notes" className="text-xs uppercase tracking-wide text-muted-foreground">
                        Sugerencias o reporte de incidencias
                      </Label>
                      <Input
                        id="feedback-notes"
                        value={feedbackNotes}
                        onChange={(event) => setFeedbackNotes(event.target.value)}
                        placeholder="Ej. El bot no entendió mi factura..."
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => void onSubmitFeedback()}
                      disabled={isSendingFeedback}
                    >
                      {isSendingFeedback ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Enviar Valoración
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white shrink-0 ml-1"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar chat"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="space-y-3 pb-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Puedes empezar con una consulta rápida:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto rounded-full px-3 py-2 text-xs font-medium shadow-sm"
                        onClick={() => void onPromptClick(prompt)}
                        disabled={isLoading}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {loadingLabel}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t bg-background p-3">
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void onSendMessage(draft)
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escribe tu pregunta..."
                className="h-11 rounded-full px-4"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full shadow-md"
                disabled={isLoading || !draft.trim()}
                aria-label="Enviar mensaje"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
            {footerNote ? (
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {footerNote}
              </p>
            ) : null}
          </div>
        </Card>
      )}
    </>
  )
}

export default ChatUI
