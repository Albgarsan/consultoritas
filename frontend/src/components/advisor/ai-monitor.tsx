"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Bot, Search, ShieldAlert, Send, Sparkles, UserRoundCheck, FilterX, Star } from "lucide-react"
import { toast } from "sonner"
import { apiFetch, parseBackendError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Conversation = {
    id: string
    title?: string | null
    user_name?: string | null
    advisor_ids?: string[]
    rating?: number
    has_incident: boolean
    incident_notes?: string | null
    security_alert: boolean
    is_human_intervening: boolean
    unread_alerts: boolean
    created_at: string
}

type Message = {
    id: string
    role: "User" | "Assistant"
    content: string
    sent_at: string
    metadata?: Record<string, unknown> | null
}

type AdvisorOption = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractArrayData(rawData: any): any[] {
    if (Array.isArray(rawData)) return rawData;
    if (rawData && typeof rawData === "object" && Array.isArray(rawData.results)) return rawData.results;
    return [];
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value))
}

export function MonitorIA({ initialSearch }: Readonly<{ initialSearch?: string }>) {
    const [searchTerm, setSearchTerm] = useState(initialSearch || "")

    useEffect(() => {
        if (initialSearch) {
            setSearchTerm(initialSearch)
        }
    }, [initialSearch])

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [advisors, setAdvisors] = useState<AdvisorOption[]>([])
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [filterSecurity, setFilterSecurity] = useState(false)
    const [filterIncident, setFilterIncident] = useState(false)
    const [filterHuman, setFilterHuman] = useState(false)
    const [filterAdvisor, setFilterAdvisor] = useState("all")
    const [filterDate, setFilterDate] = useState("all")
    const [filterRating, setFilterRating] = useState("all")

    const [replyDraft, setReplyDraft] = useState("")
    const [isLoadingConversations, setIsLoadingConversations] = useState(true)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [isTakingControl, setIsTakingControl] = useState(false)
    const [isSendingReply, setIsSendingReply] = useState(false)

    const selectedConversation = useMemo(
        () => conversations.find((c) => c.id === selectedConversationId) ?? null,
        [conversations, selectedConversationId],
    )

    const loadAdvisors = async () => {
        try {
            const response = await apiFetch("/api/users/advisors/")
            if (response.ok) {
                const data = await response.json()
                setAdvisors(extractArrayData(data))
            }
        } catch (error) {
            console.error("No se pudieron cargar los asesores", error)
        }
    }

    const loadConversations = async (silent = false) => {
        if (!silent) setIsLoadingConversations(true)
        try {
            const response = await apiFetch("/api/ai/conversations/")
            if (!response.ok) throw new Error("No se pudieron cargar las conversaciones")

            const rawData = await response.json()
            const dataArray = extractArrayData(rawData) as Conversation[]

            // PRIORIDAD 1: Las no leídas. PRIORIDAD 2: Fecha descendente.
            const sorted = dataArray.sort((a, b) => {
                const aUrgent = a.unread_alerts && (a.security_alert || a.has_incident);
                const bUrgent = b.unread_alerts && (b.security_alert || b.has_incident);
                if (aUrgent && !bUrgent) return -1;
                if (!aUrgent && bUrgent) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            })
            setConversations(sorted)
            return sorted
        } catch (error) {
            toast.error(error instanceof Error ? parseBackendError(error.message) : "Error cargando conversaciones")
            return []
        } finally {
            if (!silent) setIsLoadingConversations(false)
        }
    }

    const loadMessages = async (conversationId: string, silent = false) => {
        if (!silent) setIsLoadingMessages(true)
        try {
            const response = await apiFetch(`/api/ai/messages/?conversation=${conversationId}`)
            if (!response.ok) throw new Error("No se pudo cargar el historial")

            const rawData = await response.json()
            const dataArray = extractArrayData(rawData) as Message[]
            setMessages(
                dataArray
                    .slice()
                    .sort((left, right) => new Date(left.sent_at).getTime() - new Date(right.sent_at).getTime()),
            )
        } catch (error) {
            toast.error(error instanceof Error ? parseBackendError(error.message) : "Error cargando historial")
            setMessages([])
        } finally {
            if (!silent) setIsLoadingMessages(false)
        }
    }

    useEffect(() => {
        void loadAdvisors()
        void loadConversations()

        const interval = setInterval(() => {
            void loadConversations(true)
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!selectedConversationId) {
            setMessages([])
            return
        }
        void loadMessages(selectedConversationId)

        const msgInterval = setInterval(() => {
            void loadMessages(selectedConversationId, true)
        }, 5000)

        const conv = conversations.find(c => c.id === selectedConversationId);
        if (conv && conv.unread_alerts) {
             apiFetch(`/api/ai/conversations/${selectedConversationId}/mark_read/`, { method: "PATCH" })
             .then(res => {
                 if (res.ok) {
                     setConversations(current => current.map(c =>
                        c.id === selectedConversationId ? { ...c, unread_alerts: false } : c
                     ))
                 }
             })
             .catch(console.error)
        }

        return () => clearInterval(msgInterval)
    }, [selectedConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

    const filteredConversations = conversations.filter((c) => {
        let pass = true;
        const label = `${c.title || ''} ${c.user_name || ''}`.toLowerCase()
        if (searchTerm && !label.includes(searchTerm.toLowerCase())) pass = false;
        if (filterSecurity && !c.security_alert) pass = false;
        if (filterIncident && !c.has_incident) pass = false;
        if (filterHuman && !c.is_human_intervening) pass = false;
        if (filterAdvisor !== "all" && !(c.advisor_ids || []).includes(filterAdvisor)) pass = false;

        if (filterDate !== "all") {
            const date = new Date(c.created_at);
            const now = new Date();
            const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (filterDate === "today" && diffDays > 1) pass = false;
            if (filterDate === "week" && diffDays > 7) pass = false;
            if (filterDate === "month" && diffDays > 30) pass = false;
        }

        if (filterRating !== "all") {
            if (filterRating === "unrated" && c.rating) pass = false;
            if (filterRating !== "unrated" && (!c.rating || c.rating.toString() !== filterRating)) pass = false;
        }

        return pass;
    })

    const handleToggleControl = async () => {
        if (!selectedConversationId) return

        setIsTakingControl(true)
        try {
            const response = await apiFetch(`/api/ai/conversations/${selectedConversationId}/toggle_control/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || errorData.error || "No se pudo cambiar el control")
            }

            const data = await response.json()
            const newState = data.is_human_intervening
            toast.success(newState ? "Control humano ACTIVADO" : "Control devuelto a la IA")

            setConversations(current => current.map(c =>
                c.id === selectedConversationId ? { ...c, is_human_intervening: newState } : c
            ))
        } catch (error) {
            toast.error(error instanceof Error ? parseBackendError(error.message) : "Error al cambiar control")
        } finally {
            setIsTakingControl(false)
        }
    }

    const handleSendReply = async () => {
        if (!selectedConversationId || !replyDraft.trim()) return

        setIsSendingReply(true)
        try {
            const response = await apiFetch(`/api/ai/conversations/${selectedConversationId}/advisor_reply/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: replyDraft.trim() }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || errorData.error || "No se pudo enviar la respuesta")
            }

            setReplyDraft("")
            await loadMessages(selectedConversationId)

            setConversations(current => current.map(c =>
                c.id === selectedConversationId ? { ...c, is_human_intervening: true } : c
            ))
            toast.success("Respuesta enviada")
        } catch (error) {
            toast.error(error instanceof Error ? parseBackendError(error.message) : "Error enviando respuesta")
        } finally {
            setIsSendingReply(false)
        }
    }

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
            <div className="space-y-2 shrink-0">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                    <Sparkles className="size-3.5 text-primary" />
                    Centro de intervención humana
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Monitor IA</h2>
                    <p className="text-sm text-muted-foreground">Supervisa conversaciones, filtra clientes y toma el control manual.</p>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[450px_minmax(0,1fr)] flex-1 min-h-0">
                <Card className="border-border/60 shadow-sm flex flex-col min-h-0">
                    <CardHeader className="space-y-4 pb-4 shrink-0 border-b">
                        <CardTitle className="text-base">Filtros de Búsqueda</CardTitle>

                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Búsqueda rápida</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cliente o título..." className="pl-9 h-9 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Asesor responsable</label>
                                    <Select value={filterAdvisor} onValueChange={setFilterAdvisor}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Asesor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los asesores</SelectItem>
                                            {advisors.map(a => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    {[a.first_name, a.last_name].filter(Boolean).join(" ") || a.email}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Antigüedad del chat</label>
                                    <Select value={filterDate} onValueChange={setFilterDate}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Fecha" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Siempre</SelectItem>
                                            <SelectItem value="today">Hoy</SelectItem>
                                            <SelectItem value="week">Últimos 7 días</SelectItem>
                                            <SelectItem value="month">Este mes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground font-medium">Filtrar por valoración</label>
                                    <Select value={filterRating} onValueChange={setFilterRating}>
                                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Valoración" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Cualquiera</SelectItem>
                                            <SelectItem value="5">⭐⭐⭐⭐⭐</SelectItem>
                                            <SelectItem value="4">⭐⭐⭐⭐</SelectItem>
                                            <SelectItem value="3">⭐⭐⭐</SelectItem>
                                            <SelectItem value="2">⭐⭐</SelectItem>
                                            <SelectItem value="1">⭐</SelectItem>
                                            <SelectItem value="unrated">Sin valorar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium mr-1">Etiquetas de atención:</span>
                                <button onClick={() => setFilterSecurity(!filterSecurity)} className={cn("px-2.5 py-1 text-[11px] rounded-full border transition-all", filterSecurity ? "bg-rose-100 border-rose-300 text-rose-800" : "bg-muted text-muted-foreground hover:bg-muted/80")}>🚨 Alertas</button>
                                <button onClick={() => setFilterIncident(!filterIncident)} className={cn("px-2.5 py-1 text-[11px] rounded-full border transition-all", filterIncident ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-muted text-muted-foreground hover:bg-muted/80")}>⚠️ Incidencias</button>
                                <button onClick={() => setFilterHuman(!filterHuman)} className={cn("px-2.5 py-1 text-[11px] rounded-full border transition-all", filterHuman ? "bg-sky-100 border-sky-300 text-sky-800" : "bg-muted text-muted-foreground hover:bg-muted/80")}>👤 Humanos</button>
                                {(filterSecurity || filterIncident || filterHuman || filterAdvisor !== "all" || filterDate !== "all" || filterRating !== "all" || searchTerm) && (
                                    <button onClick={() => { setFilterSecurity(false); setFilterIncident(false); setFilterHuman(false); setFilterAdvisor("all"); setFilterDate("all"); setFilterRating("all"); setSearchTerm(""); }} className="ml-auto px-2.5 py-1 text-[11px] rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"><FilterX className="size-3" /> Limpiar filtros</button>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0 bg-slate-50/50 min-h-0">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-2">
                                {isLoadingConversations ? (
                                    <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">Cargando...</div>
                                ) : filteredConversations.length === 0 ? (
                                    <div className="rounded-xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">No hay coincidencias con los filtros aplicados.</div>
                                ) : (
                                    filteredConversations.map((conversation) => {
                                        const active = conversation.id === selectedConversationId
                                        const isUnread = conversation.unread_alerts && (conversation.security_alert || conversation.has_incident)
                                        return (
                                            <button
                                                key={conversation.id}
                                                type="button"
                                                onClick={() => setSelectedConversationId(conversation.id)}
                                                className={cn(
                                                    "relative w-full rounded-xl border bg-background p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40",
                                                    active && "border-primary/50 bg-primary/[0.02] shadow-sm ring-1 ring-primary/20",
                                                )}
                                            >
                                                {isUnread && (
                                                    <span className="absolute -top-1 -left-1 flex size-3">
                                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                      <span className="relative inline-flex rounded-full size-3 bg-rose-500"></span>
                                                    </span>
                                                )}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate text-sm font-semibold text-foreground">
                                                                {conversation.title || `Chat ${conversation.id.slice(0, 5)}`}
                                                            </p>
                                                        </div>
                                                        <p className="truncate text-xs font-medium text-slate-500">{conversation.user_name}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(conversation.created_at)}</span>
                                                        {conversation.rating ? <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium"><Star className="size-2.5 fill-current" /> {conversation.rating}</span> : null}
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {conversation.security_alert && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0"><ShieldAlert className="mr-1 size-2.5" /> Alerta</Badge>}
                                                    {conversation.has_incident && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0"><AlertTriangle className="mr-1 size-2.5" /> Incidencia</Badge>}
                                                    {conversation.is_human_intervening && <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 text-[10px] px-1.5 py-0"><UserRoundCheck className="mr-1 size-2.5" /> Humano</Badge>}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* COLUMNA DERECHA: Chat */}
                <Card className="border-border/60 shadow-sm flex flex-col min-h-0">
                    <CardHeader className="space-y-3 border-b shrink-0">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <CardTitle className="text-base">
                                    {selectedConversation ? selectedConversation.title || "Chat" : "Selecciona una conversación"}
                                </CardTitle>
                                <CardDescription>
                                    {selectedConversation ? `Cliente: ${selectedConversation.user_name}` : "El historial aparecerá aquí."}
                                </CardDescription>
                            </div>
                            {selectedConversation ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                    <Button
                                        type="button"
                                        variant={selectedConversation.is_human_intervening ? "destructive" : "default"}
                                        onClick={() => void handleToggleControl()}
                                        disabled={isTakingControl}
                                        size="sm"
                                    >
                                        <Bot className="mr-2 size-4" />
                                        {isTakingControl ? "Procesando..." : (selectedConversation.is_human_intervening ? "Devolver Control a la IA" : "Activar Control Humano")}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                        {selectedConversation?.has_incident && selectedConversation?.incident_notes && (
                            <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-sm shadow-sm">
                                <span className="font-bold">📝 Nota del Cliente:</span> {selectedConversation.incident_notes}
                            </div>
                        )}
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-4 overflow-hidden min-h-0">
                        <ScrollArea className="flex-1 rounded-2xl border bg-background/60 p-4 mb-4 min-h-0">
                            {isLoadingMessages ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando historial...</div>
                            ) : messages.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No hay mensajes para mostrar.</div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((message) => {
                                        const isAlert = message.metadata?.is_security_alert;
                                        return (
                                        <div key={message.id} className={cn("flex gap-3", message.role === "Assistant" ? "justify-start" : "justify-end") }>
                                            {message.role === "Assistant" ? (
                                                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white mt-1", isAlert ? "bg-rose-600" : "bg-primary")}>
                                                    <Bot className="size-4" />
                                                </div>
                                            ) : null}
                                            <div
                                                className={cn(
                                                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                                                    message.role === "Assistant"
                                                        ? (isAlert ? "border-2 border-rose-500 bg-rose-50 text-rose-900 font-medium" : "bg-muted text-foreground")
                                                        : "bg-primary text-primary-foreground",
                                                )}
                                            >
                                                <div className="mb-1 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide opacity-70">
                                                    <span>{message.role === "Assistant" ? (message.metadata?.source === "advisor" ? "Asesor (Humano)" : "IA") : "Cliente"}</span>
                                                    <span>{formatDate(message.sent_at)}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap">{message.content}</p>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </ScrollArea>

                        <div className="space-y-3 shrink-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Send className="size-4 text-primary" />
                                Enviar Mensaje (Automáticamente Activa el Control Humano)
                            </div>
                            <Textarea
                                value={replyDraft}
                                onChange={(event) => setReplyDraft(event.target.value)}
                                placeholder="Escribe la respuesta que verá el cliente..."
                                className="min-h-[80px] resize-none rounded-2xl"
                                disabled={!selectedConversation || isSendingReply}
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground"></p>
                                <Button type="button" onClick={() => void handleSendReply()} disabled={!selectedConversation || isSendingReply || !replyDraft.trim()}>
                                    <Send className="mr-2 size-4" />
                                    {isSendingReply ? "Enviando..." : "Enviar al Cliente"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default MonitorIA
