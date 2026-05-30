"use client"

import { useState } from "react"
import {
  Search,
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  Separator
} from "@/components/ui/separator"
import { MessageSquare,
  Smile,
  Meh,
  Frown,
  User,
  Bot,
  Clock,
  Eye,
  StickyNote,
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"
  const conversations: Array<{
    id: string
    cliente: string
    avatar: string
    tipo: "privada" | "publica"
    sentimiento: "positivo" | "negativo" | "neutro"
    ultimaInteraccion: string
    preview: string
    messages: Array<{ role: "user" | "assistant"; content: string }>
  }> = []

export function MonitorIA() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedConversation, setSelectedConversation] = useState<typeof conversations[0] | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [advisorNote, setAdvisorNote] = useState("")
  const [interventionMessage, setInterventionMessage] = useState("")

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.preview.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || conv.tipo === typeFilter
    return matchesSearch && matchesType
  })

  const handleViewHistory = (conv: typeof conversations[0]) => {
    setSelectedConversation(conv)
    setIsHistoryOpen(true)
    setAdvisorNote("")
    setInterventionMessage("")
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positivo":
        return <Smile className="size-4 text-emerald-600" />
      case "negativo":
        return <Frown className="size-4 text-rose-600" />
      default:
        return <Meh className="size-4 text-amber-600" />
    }
  }

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "positivo":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Positivo</Badge>
      case "negativo":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Negativo</Badge>
      default:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Neutro</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Supervisión de Consultores IA</h2>
            <p className="text-muted-foreground mt-1">
          Monitor de interacciones con clientes sincronizadas
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{conversations.length}</p>
                <p className="text-sm text-muted-foreground">Conversaciones Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50">
                <Smile className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {conversations.filter(c => c.sentimiento === "positivo").length}
                </p>
                <p className="text-sm text-muted-foreground">Positivas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50">
                <Meh className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {conversations.filter(c => c.sentimiento === "neutro").length}
                </p>
                <p className="text-sm text-muted-foreground">Neutras</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-rose-50">
                <Frown className="size-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {conversations.filter(c => c.sentimiento === "negativo").length}
                </p>
                <p className="text-sm text-muted-foreground">Negativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]">
                <Filter className="size-4 mr-2" />
                <SelectValue placeholder="Tipo de consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Consultas</SelectItem>
                <SelectItem value="privada">Consultas Privadas (Dashboard)</SelectItem>
                <SelectItem value="publica">Consultas Públicas (Landing)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Lista de Conversaciones</CardTitle>
          <CardDescription>
            Últimas interacciones de clientes con la IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Última Interacción</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Consulta</TableHead>
                <TableHead>Sentimiento</TableHead>
                <TableHead>Vista Previa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="size-4" />
                      <span className="text-sm">{conv.ultimaInteraccion}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{conv.cliente}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {conv.tipo === "privada" ? (
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        <User className="size-3 mr-1" />
                        Dashboard
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Bot className="size-3 mr-1" />
                        Landing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(conv.sentimiento)}
                      {getSentimentBadge(conv.sentimiento)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground truncate">{conv.preview}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleViewHistory(conv)}
                    >
                      <Eye className="size-3.5" />
                      Ver Historial
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredConversations.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay conversaciones sincronizadas.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {selectedConversation?.avatar}
                </AvatarFallback>
              </Avatar>
              Historial de Chat - {selectedConversation?.cliente}
            </DialogTitle>
            <DialogDescription>
              Conversación completa y herramientas de intervención
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <Tabs defaultValue="chat" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">Conversación</TabsTrigger>
                <TabsTrigger value="actions">Acciones del Asesor</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <ScrollArea className="h-[350px] rounded-lg border border-border p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={
                            msg.role === "assistant"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }>
                            {msg.role === "assistant" ? <Bot className="size-4" /> : selectedConversation.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`rounded-lg p-3 max-w-[80%] ${
                          msg.role === "assistant"
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="actions" className="mt-4 space-y-4">
                {/* Internal Note */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <StickyNote className="size-4 text-amber-600" />
                    <h4 className="font-medium">Añadir Nota Interna</h4>
                  </div>
                  <Textarea
                    placeholder="Escribe una nota interna sobre esta conversación..."
                    value={advisorNote}
                    onChange={(e) => setAdvisorNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button variant="outline" size="sm" className="gap-2">
                    <StickyNote className="size-4" />
                    Guardar Nota
                  </Button>
                </div>

                <Separator />

                {/* Intervention */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Send className="size-4 text-primary" />
                    <h4 className="font-medium">Intervenir en el Chat</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Envía un mensaje directamente al cliente como asesor humano.
                  </p>
                  <Textarea
                    placeholder="Escribe tu mensaje de intervención..."
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button className="gap-2">
                    <Send className="size-4" />
                    Enviar como Asesor
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
