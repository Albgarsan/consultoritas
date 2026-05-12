"use client"

import { useState } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DocumentFilterOptions = {
  status?: string
  dateFromMillis?: number
  dateToMillis?: number
  preset?: "last90" | "semester" | "custom" | undefined
  client?: string
}

interface DocumentFilterProps {
  onFilterChange: (filters: DocumentFilterOptions) => void
  presets?: boolean
  clientFilter?: string
  onClientFilterChange?: (value: string) => void
  clientOptions?: string[]
}

export function DocumentFilter({
  onFilterChange,
  presets = true,
  clientFilter,
  onClientFilterChange,
  clientOptions = [],
}: DocumentFilterProps) {
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [preset, setPreset] = useState<"last90" | "semester" | undefined>(undefined)

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus === "all" ? undefined : newStatus)
    triggerUpdate({
      status: newStatus === "all" ? undefined : newStatus,
      dateFromMillis: dateFrom?.getTime(),
      dateToMillis: dateTo?.getTime(),
      preset,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const handleClientChange = (newClient: string) => {
    onClientFilterChange?.(newClient)
    triggerUpdate({
      status,
      dateFromMillis: dateFrom?.getTime(),
      dateToMillis: dateTo?.getTime(),
      preset,
      client: newClient === "all" ? undefined : newClient,
    })
  }

  const handlePreset = (presetType: "last90" | "semester") => {
    const now = new Date()
    const newFrom = new Date()

    if (presetType === "last90") {
      newFrom.setDate(now.getDate() - 90)
    } else if (presetType === "semester") {
      newFrom.setDate(now.getDate() - 180)
    }

    setPreset(presetType)
    setDateFrom(newFrom)
    setDateTo(now)
    triggerUpdate({
      status,
      dateFromMillis: newFrom.getTime(),
      dateToMillis: now.getTime(),
      preset: presetType,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const handleCustomDate = (type: "from" | "to", date: Date | undefined) => {
    const normalizedDate = type === "to" && date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
      : date

    if (type === "from") {
      setDateFrom(normalizedDate)
      setPreset(undefined)
    } else {
      setDateTo(normalizedDate)
      setPreset(undefined)
    }

    const finalFrom = type === "from" ? normalizedDate : dateFrom
    const finalTo = type === "to" ? normalizedDate : dateTo

    triggerUpdate({
      status,
      dateFromMillis: finalFrom?.getTime(),
      dateToMillis: finalTo?.getTime(),
      preset: undefined,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const triggerUpdate = (filters: DocumentFilterOptions) => {
    onFilterChange(filters)
  }

  const clearStatus = () => {
    setStatus(undefined)
    triggerUpdate({
      dateFromMillis: dateFrom?.getTime(),
      dateToMillis: dateTo?.getTime(),
      preset,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const clearClient = () => {
    onClientFilterChange?.("all")
    triggerUpdate({
      status,
      dateFromMillis: dateFrom?.getTime(),
      dateToMillis: dateTo?.getTime(),
      preset,
    })
  }

  const clearDateRange = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setPreset(undefined)
    triggerUpdate({
      status,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const clearPreset = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setPreset(undefined)
    triggerUpdate({
      status,
      client: clientFilter === "all" ? undefined : clientFilter,
    })
  }

  const clearFilters = () => {
    setStatus(undefined)
    setDateFrom(undefined)
    setDateTo(undefined)
    setPreset(undefined)
    onClientFilterChange?.("all")
    triggerUpdate({})
  }

  const hasActiveFilters = status || dateFrom || dateTo || preset || (clientFilter && clientFilter !== "all")

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            {/* Left Side: Status + Client */}
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                  <label htmlFor="status-select" className="text-xs font-medium text-muted-foreground">Estado</label>
                  <Select value={status || "all"} onValueChange={handleStatusChange}>
                    <SelectTrigger id="status-select" className="h-9">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="procesado">Procesado</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="enviada">Enviada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {onClientFilterChange && (
                  <div className="space-y-2">
                    <label htmlFor="client-select" className="text-xs font-medium text-muted-foreground">Cliente</label>
                    <Select value={clientFilter || "all"} onValueChange={handleClientChange}>
                      <SelectTrigger id="client-select" className="h-9">
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client} value={client}>
                            {client}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

            </div>

            {/* Right Side: Date Range + Clear */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-1">
                {presets && (
                  <>
                    <Button
                      variant={preset === "last90" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePreset("last90")}
                      className="text-xs h-9 whitespace-nowrap"
                    >
                      90 días
                    </Button>
                    <Button
                      variant={preset === "semester" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePreset("semester")}
                      className="text-xs h-9 whitespace-nowrap"
                    >
                      Semestre
                    </Button>
                  </>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-9 whitespace-nowrap">
                      <Calendar className="size-4 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs">Desde</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <p className="text-xs font-medium mb-1.5">Desde</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => handleCustomDate("from", date)}
                        disabled={(date) => dateTo ? date > dateTo : false}
                        className="rounded-md border text-xs"
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-9 whitespace-nowrap">
                      <Calendar className="size-4 flex-shrink-0" />
                      <span className="hidden sm:inline text-xs">Hasta</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3">
                      <p className="text-xs font-medium mb-1.5">Hasta</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => handleCustomDate("to", date)}
                        disabled={(date) => dateFrom ? date < dateFrom : false}
                        className="rounded-md border text-xs"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {status && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearStatus}
                    className="h-8 gap-2 rounded-full border-dashed px-3 text-xs"
                  >
                    Estado: {status}
                    <X className="size-3" />
                  </Button>
                )}
                {clientFilter && clientFilter !== "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearClient}
                    className="h-8 gap-2 rounded-full border-dashed px-3 text-xs"
                  >
                    Cliente: {clientFilter}
                    <X className="size-3" />
                  </Button>
                )}
                {preset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearPreset}
                    className="h-8 gap-2 rounded-full border-dashed px-3 text-xs"
                  >
                    Período: {preset === "last90" ? "Últimos 90 días" : "Último semestre"}
                    <X className="size-3" />
                  </Button>
                )}
                {!preset && dateFrom && dateTo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDateRange}
                    className="h-8 gap-2 rounded-full border-dashed px-3 text-xs"
                  >
                    Rango: {dateFrom.toLocaleDateString("es-ES")} - {dateTo.toLocaleDateString("es-ES")}
                    <X className="size-3" />
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-8 px-2 whitespace-nowrap self-start sm:self-auto"
              >
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
