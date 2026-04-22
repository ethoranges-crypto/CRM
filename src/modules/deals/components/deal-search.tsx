"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DealCardDialog } from "./deal-card-dialog"
import type { ColumnWithDeals, DealWithNotes, Label } from "../types"

interface DealSearchProps {
  columns: ColumnWithDeals[]
  allLabels: Label[]
  canEdit: boolean
}

interface FlatDeal {
  deal: DealWithNotes
  columnTitle: string
}

export function DealSearch({ columns, allLabels, canEdit }: DealSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealWithNotes | null>(null)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Flatten all deals with their column title
  const allDeals: FlatDeal[] = columns.flatMap((col) =>
    col.deals.map((deal) => ({ deal, columnTitle: col.title }))
  )

  const q = query.trim().toLowerCase()
  const results: FlatDeal[] = q.length === 0 ? [] : allDeals.filter(({ deal }) =>
    deal.company?.toLowerCase().includes(q) ||
    deal.alias.toLowerCase().includes(q) ||
    deal.telegramHandle?.toLowerCase().includes(q)
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Reset highlight when results change
  useEffect(() => {
    setHighlighted(0)
  }, [query])

  function handleSelect(deal: DealWithNotes) {
    setSelectedDeal(deal)
    setQuery("")
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleSelect(results[highlighted].deal)
    } else if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
      inputRef.current?.blur()
    }
  }

  function highlight(text: string): React.ReactNode {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm bg-yellow-200 px-0 dark:bg-yellow-700 dark:text-white">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <>
      <div ref={containerRef} className="relative w-64">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => { if (query) setOpen(true) }}
            onKeyDown={handleKeyDown}
            placeholder="Search deals..."
            className="h-9 w-full rounded-md border border-input bg-background py-1 pl-8 pr-8 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && q.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No deals match &ldquo;{query}&rdquo;
              </p>
            ) : (
              <ul>
                {results.map(({ deal, columnTitle }, i) => (
                  <li key={deal.id}>
                    <button
                      className={cn(
                        "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        i === highlighted
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                      onMouseEnter={() => setHighlighted(i)}
                      onClick={() => handleSelect(deal)}
                    >
                      {/* Label colour dots */}
                      {deal.labels.length > 0 && (
                        <div className="mt-1 flex shrink-0 flex-col gap-0.5">
                          {deal.labels.slice(0, 3).map((l) => (
                            <span
                              key={l.id}
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: l.color }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {highlight(deal.company ?? deal.alias)}
                        </p>
                        {deal.company && (
                          <p className="truncate text-xs text-muted-foreground">
                            {highlight(deal.alias)}
                          </p>
                        )}
                        {deal.telegramHandle && (
                          <p className="truncate text-xs text-muted-foreground">
                            @{highlight(deal.telegramHandle)}
                          </p>
                        )}
                      </div>
                      <span className="mt-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {columnTitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Dialog — opens exactly as clicking the card on the board */}
      {selectedDeal && (
        <DealCardDialog
          deal={selectedDeal}
          allLabels={allLabels}
          canEdit={canEdit}
          open={!!selectedDeal}
          onOpenChange={(open) => { if (!open) setSelectedDeal(null) }}
        />
      )}
    </>
  )
}
