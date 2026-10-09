"use client"

import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  /** Extra text the search also matches, e.g. the English name of a translated label. */
  keywords?: string[]
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  /** Values pinned above the full list, under `suggestedHeading`. */
  suggested?: string[]
  suggestedHeading?: string
  allHeading?: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  /** When set, typed text that matches nothing can be used as the value. */
  customLabel?: (query: string) => string
  disabled?: boolean
  id?: string
}

// Case- and accent-insensitive, so "fes" finds "Fès" and "cote" finds "Côte d'Ivoire".
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

type Row =
  | { kind: "heading"; label: string }
  | { kind: "option"; option: ComboboxOption }
  | { kind: "custom"; value: string }

export function Combobox({
  value,
  onChange,
  options,
  suggested = [],
  suggestedHeading,
  allHeading,
  placeholder,
  searchPlaceholder,
  emptyText,
  customLabel,
  disabled,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const rows = React.useMemo<Row[]>(() => {
    const q = normalize(query.trim())
    if (q) {
      // Rank names that start with the query first, then ones with a word that
      // does, so "india" puts India above "British Indian Ocean Territory".
      const rank = (o: ComboboxOption) => {
        const texts = [o.label, o.value, ...(o.keywords ?? [])].map(normalize)
        if (texts.some(text => text.startsWith(q))) return 0
        if (texts.some(text => text.split(/[\s\-'’(]+/).some(word => word.startsWith(q)))) return 1
        if (texts.some(text => text.includes(q))) return 2
        return -1
      }
      const matches = options
        .map((option, index) => ({ option, index, rank: rank(option) }))
        .filter(m => m.rank >= 0)
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map(m => m.option)
      const rows: Row[] = matches.map(option => ({ kind: "option", option }))
      const exact = matches.some(o => normalize(o.label) === q || normalize(o.value) === q)
      if (customLabel && !exact) rows.push({ kind: "custom", value: query.trim() })
      return rows
    }
    const pinned = suggested
      .map(v => options.find(o => o.value === v))
      .filter((o): o is ComboboxOption => !!o)
    if (pinned.length === 0) return options.map(option => ({ kind: "option", option }))
    return [
      ...(suggestedHeading ? [{ kind: "heading", label: suggestedHeading } as Row] : []),
      ...pinned.map(option => ({ kind: "option", option }) as Row),
      ...(allHeading ? [{ kind: "heading", label: allHeading } as Row] : []),
      ...options.map(option => ({ kind: "option", option }) as Row),
    ]
  }, [query, options, suggested, suggestedHeading, allHeading, customLabel])

  const selectable = React.useMemo(
    () => rows.map((row, index) => ({ row, index })).filter(({ row }) => row.kind !== "heading"),
    [rows],
  )

  // Keep the highlighted row valid as the list is filtered.
  React.useEffect(() => {
    setActive(0)
  }, [query, open])

  React.useEffect(() => {
    const index = selectable[active]?.index
    if (index === undefined) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row="${index}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [active, selectable])

  function choose(row: Row) {
    if (row.kind === "option") onChange(row.option.value)
    else if (row.kind === "custom") onChange(row.value)
    setOpen(false)
    setQuery("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive(i => Math.min(i + 1, selectable.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const target = selectable[active]
      if (target) choose(target.row)
    }
  }

  const selectedLabel = options.find(o => o.value === value)?.label ?? value
  const activeIndex = selectable[active]?.index

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
          )}
        >
          <span className="line-clamp-1 text-start">{value ? selectedLabel : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          aria-controls={listId}
          aria-activedescendant={activeIndex !== undefined ? `${listId}-${activeIndex}` : undefined}
          className="w-full border-b border-border bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {selectable.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
          {rows.map((row, index) => {
            if (row.kind === "heading") {
              return (
                <p
                  key={`h-${row.label}`}
                  className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {row.label}
                </p>
              )
            }
            const isActive = index === activeIndex
            const isSelected = row.kind === "option" && row.option.value === value
            return (
              <div
                key={row.kind === "option" ? `${index}-${row.option.value}` : "custom"}
                id={`${listId}-${index}`}
                data-row={index}
                role="option"
                aria-selected={isSelected}
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(row)}
                onMouseEnter={() => setActive(selectable.findIndex(s => s.index === index))}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  isActive && "bg-accent text-accent-foreground",
                )}
              >
                {row.kind === "custom" ? (
                  <>
                    <Plus className="h-4 w-4 shrink-0 opacity-60" />
                    {customLabel?.(row.value)}
                  </>
                ) : (
                  <>
                    <Check className={cn("h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    {row.option.label}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
