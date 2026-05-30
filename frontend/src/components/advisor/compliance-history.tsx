"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useApiData } from "@/lib/use-api"

type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4"

type ClientRecord = {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  primary_business?: {
    id?: string | null
    name?: string | null
  }
}

type TaxCalendarEntry = {
  id: string
  tax_type?: string
  period?: string
  period_start?: string | null
  period_end?: string | null
  deadline?: string | null
  is_presented?: boolean
  presented_date?: string | null
  presented_by_name?: string | null
  business?: { id?: string | null }
}

type NormalizedHistoryEntry = {
  id: string
  model: string
  quarter: QuarterKey
  year: number
  periodLabel: string
  periodStart: string
  deadline: string | null
  isPresented: boolean
  presentedDate: string | null
  presentedByName: string | null
}

const VALID_MODELS = ["111", "115", "123", "130", "202", "303"]
const QUARTERS: QuarterKey[] = ["Q1", "Q2", "Q3", "Q4"]

function quarterFromDate(date: Date): QuarterKey {
  const month = date.getMonth() + 1
  if (month <= 3) return "Q1"
  if (month <= 6) return "Q2"
  if (month <= 9) return "Q3"
  return "Q4"
}

function toModelCode(value?: string | null): string {
  const raw = String(value || "").trim().toUpperCase()
  const direct = raw.match(/\b(111|115|123|130|202|303)\b/)
  if (direct) return direct[1]

  if (raw.includes("IVA")) return "303"
  if (raw.includes("PAGOS A CUENTA") || raw.includes("PAGO A CUENTA")) return "115"
  if (raw.includes("ALQUILER") || raw.includes("ARREND")) return "115"
  if (raw.includes("PROFES") || raw.includes("PROF")) return "123"
  if (raw.includes("IRPF") || raw.includes("RETENCI") || raw.includes("130")) return "130"
  if (raw.includes("SOCIEDAD") || raw.includes("202")) return "202"
  if (raw.includes("111")) return "111"

  return raw
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(dateStr?: string | null) {
  const date = parseDate(dateStr)
  if (!date) return "-"
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateTime(dateStr?: string | null) {
  const date = parseDate(dateStr)
  if (!date) return "-"
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isOverdue(deadline?: string | null) {
  const due = parseDate(deadline)
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function clientLabel(client: ClientRecord) {
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(" ").trim()
  return fullName || client.email || "Cliente"
}

export default function ComplianceHistory() {
  const [selectedBusinessId, setSelectedBusinessId] = useState("")
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [clientOpen, setClientOpen] = useState(false)

  const { data: clients = [] } = useApiData<ClientRecord[]>("/api/users/clients/?page_size=500", {
    dedupingInterval: 60_000,
  })

  const clientOptions = useMemo(() => {
    return clients
      .map((client) => {
        const businessId = client.primary_business?.id ? String(client.primary_business.id) : ""
        if (!businessId) return null

        return {
          value: businessId,
          label: clientLabel(client),
          secondary: client.primary_business?.name || client.email || "",
        }
      })
      .filter((option): option is { value: string; label: string; secondary: string } => Boolean(option))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [clients])

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, index) => String(currentYear - index))
  }, [])

  const historyKey = selectedBusinessId
    ? `/api/documents/tax-calendar/?business_id=${selectedBusinessId}&year=${year}`
    : `/api/documents/tax-calendar/?business_id=__none&year=${year}`

  const { data: entries = [] } = useApiData<TaxCalendarEntry[]>(historyKey, {
    dedupingInterval: 30_000,
  })

  const normalizedEntries = useMemo<NormalizedHistoryEntry[]>(() => {
    return entries
      .map((entry) => {
        const model = toModelCode(entry.tax_type)
        if (!VALID_MODELS.includes(model)) return null

        const periodStart = parseDate(entry.period_start)
        if (!periodStart) return null

        const quarter = quarterFromDate(periodStart)
        const entryYear = periodStart.getFullYear()

        return {
          id: entry.id,
          model,
          quarter,
          year: entryYear,
          periodLabel: entry.period || `${quarter} ${entryYear}`,
          periodStart: entry.period_start || "",
          deadline: entry.deadline || null,
          isPresented: Boolean(entry.is_presented),
          presentedDate: entry.presented_date || null,
          presentedByName: entry.presented_by_name || null,
        }
      })
      .filter((entry): entry is NormalizedHistoryEntry => Boolean(entry))
  }, [entries])

  const dedupedEntries = useMemo(() => {
    const map = new Map<string, NormalizedHistoryEntry>()

    for (const entry of normalizedEntries) {
      const key = `${entry.year}-${entry.quarter}-${entry.model}`
      const existing = map.get(key)

      if (!existing) {
        map.set(key, entry)
        continue
      }

      if (entry.isPresented && !existing.isPresented) {
        map.set(key, entry)
        continue
      }

      if (entry.isPresented && existing.isPresented) {
        const currentPresented = parseDate(entry.presentedDate)?.getTime() ?? 0
        const previousPresented = parseDate(existing.presentedDate)?.getTime() ?? 0
        if (currentPresented >= previousPresented) {
          map.set(key, entry)
        }
      }
    }

    return Array.from(map.values()).sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year
      if (left.quarter !== right.quarter) return QUARTERS.indexOf(left.quarter) - QUARTERS.indexOf(right.quarter)
      return left.model.localeCompare(right.model)
    })
  }, [normalizedEntries])

  const groupedByQuarter = useMemo(() => {
    const groups = new Map<string, NormalizedHistoryEntry[]>()

    for (const entry of dedupedEntries) {
      const key = `${entry.year}-${entry.quarter}`
      const bucket = groups.get(key) || []
      bucket.push(entry)
      groups.set(key, bucket)
    }

    return QUARTERS.flatMap((quarter) => {
      const quarterGroups = Array.from(groups.entries())
        .filter(([key]) => key.endsWith(`-${quarter}`))
        .map(([key, value]) => ({ key, entries: value }))
        .sort((left, right) => right.key.localeCompare(left.key))

      return quarterGroups.map(({ key, entries: quarterEntries }) => ({
        key,
        quarter,
        year: Number(key.split("-")[0]),
        entries: quarterEntries.sort((left, right) => left.model.localeCompare(right.model)),
      }))
    })
  }, [dedupedEntries])

  const sections = groupedByQuarter.filter((section) => String(section.year) === year)
  const selectedLabel = clientOptions.find((option) => option.value === selectedBusinessId)?.label

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Histórico Fiscal de Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona un cliente y un año para revisar modelos, estados y timestamps de presentación.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-md">
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="w-full justify-between"
                  >
                    <span className="truncate text-left">
                      {selectedLabel || "Elegir cliente..."}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {clientOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={`${option.label} ${option.secondary}`.trim()}
                            onSelect={() => {
                              setSelectedBusinessId(option.value)
                              setClientOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                selectedBusinessId === option.value ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{option.label}</span>
                              <span className="truncate text-xs text-muted-foreground">{option.secondary}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full lg:w-40">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((optionYear) => (
                    <SelectItem key={optionYear} value={optionYear}>
                      {optionYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedBusinessId ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          Busca y selecciona un cliente para ver su histórico fiscal.
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          No hay modelos válidos para el cliente y año seleccionados.
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={sections.map((section) => section.key)} className="space-y-3">
          {sections.map((section) => {
            const presentedCount = section.entries.filter((entry) => entry.isPresented).length
            const overdueCount = section.entries.filter((entry) => !entry.isPresented && isOverdue(entry.deadline)).length
            const pendingCount = section.entries.length - presentedCount - overdueCount

            return (
              <AccordionItem key={section.key} value={section.key} className="rounded-lg border border-border bg-card px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {section.quarter}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-foreground">{section.quarter} {section.year}</div>
                        <div className="text-xs text-muted-foreground">{section.entries.length} registros limpios</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Presentados {presentedCount}
                      </Badge>
                      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                        Vencidos {overdueCount}
                      </Badge>
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Pendientes {pendingCount}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Periodo</TableHead>
                          <TableHead>Fecha Límite</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Fecha de Presentación</TableHead>
                          <TableHead>Presentado por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.entries.map((entry) => {
                          const presented = entry.isPresented
                          const overdue = !presented && isOverdue(entry.deadline)

                          return (
                            <TableRow key={entry.id}>
                              <TableCell className="font-medium">Modelo {entry.model}</TableCell>
                              <TableCell>{entry.periodLabel}</TableCell>
                              <TableCell>{formatDate(entry.deadline)}</TableCell>
                              <TableCell>
                                {presented ? (
                                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Presentado</Badge>
                                ) : overdue ? (
                                  <Badge className="border-rose-200 bg-rose-50 text-rose-700">Vencido</Badge>
                                ) : (
                                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">Pendiente</Badge>
                                )}
                              </TableCell>
                              <TableCell>{presented ? formatDateTime(entry.presentedDate) : "-"}</TableCell>
                              <TableCell>{presented ? entry.presentedByName || "-" : "-"}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
