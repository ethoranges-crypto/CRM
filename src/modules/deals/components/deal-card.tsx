"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { setActionTaken } from "../actions"
import type { DealWithNotes } from "../types"

interface DealCardProps {
  deal: DealWithNotes
  columnId?: string
  canEdit?: boolean
  isOverlay?: boolean
  showLabelText?: boolean
  onToggleLabelText?: () => void
  onClick?: () => void
}

// Returns number of business days (Mon–Fri) since a given date
function businessDaysSince(date: Date): number {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let count = 0
  const d = new Date(start)
  while (d < now) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

// Returns inline style colours for the days badge
function actionBadgeColors(days: number): { background: string; color: string } {
  if (days <= 0) return { background: "#dbeafe", color: "#1d4ed8" } // blue-100 / blue-700
  if (days === 1) return { background: "#bfdbfe", color: "#1e40af" } // blue-200 / blue-800
  if (days === 2) return { background: "#93c5fd", color: "#1e3a8a" } // blue-300 / blue-900
  if (days === 3) return { background: "#60a5fa", color: "#fff" }     // blue-400 / white
  if (days === 4) return { background: "#fca5a5", color: "#b91c1c" } // red-300 / red-700
  if (days === 5) return { background: "#f87171", color: "#991b1b" } // red-400 / red-800
  if (days === 6) return { background: "#ef4444", color: "#fff" }     // red-500 / white
  return { background: "#b91c1c", color: "#fff" }                      // red-700 / white (7+)
}

export function DealCard({
  deal,
  columnId,
  canEdit,
  isOverlay,
  showLabelText = false,
  onToggleLabelText,
  onClick,
}: DealCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Optimistic local state so the badge appears/disappears instantly
  const [actionTakenAt, setActionTakenAt] = useState<Date | null>(
    deal.actionTakenAt ?? null
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: { type: "card", columnId },
    disabled: !canEdit,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleToggleAction(e: React.MouseEvent) {
    e.stopPropagation()
    if (!canEdit || isPending) return
    const newValue = actionTakenAt ? null : new Date()
    setActionTakenAt(newValue) // optimistic
    startTransition(async () => {
      await setActionTaken(deal.id, !actionTakenAt)
      router.refresh()
    })
  }

  const days = actionTakenAt ? businessDaysSince(actionTakenAt) : null
  const badgeColors = days !== null ? actionBadgeColors(days) : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canEdit ? listeners : {})}
      onClick={onClick}
      className={cn(
        "relative",
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        isOverlay && "shadow-lg ring-2 ring-primary",
        onClick && "cursor-pointer"
      )}
    >
      {/* Action-pending days badge — top right */}
      {days !== null && badgeColors && (
        <span
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold leading-none"
          style={badgeColors}
          title={`Action taken ${days} business day${days !== 1 ? "s" : ""} ago`}
        >
          {days}
        </span>
      )}

      <CardContent className="space-y-1.5 p-3">
        {deal.labels.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            onClick={(e) => {
              e.stopPropagation()
              onToggleLabelText?.()
            }}
          >
            {deal.labels.map((label) =>
              showLabelText ? (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                >
                  {label.name}
                </span>
              ) : (
                <span
                  key={label.id}
                  className="inline-block h-2 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              )
            )}
          </div>
        )}

        {deal.company
          ? <p className="text-sm font-medium">{deal.company}</p>
          : <p className="text-sm font-medium">{deal.alias}</p>
        }
        {deal.company && (
          <p className="text-xs text-muted-foreground">{deal.alias}</p>
        )}
        {deal.telegramHandle && (
          <Badge variant="secondary" className="text-xs">
            @{deal.telegramHandle}
          </Badge>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {deal.reminders?.filter((r) => r.status === "active").length > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <Bell className="h-3 w-3" />
              {deal.reminders.filter((r) => r.status === "active").length}
            </span>
          )}
          {deal.notes.length > 0 && (
            <span>
              {deal.notes.length} note{deal.notes.length !== 1 ? "s" : ""}
            </span>
          )}
          {deal.customFields.length > 0 && (
            <span>
              {deal.customFields.length} field
              {deal.customFields.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Action-pending toggle — only in edit mode */}
          {canEdit && (
            <button
              onClick={handleToggleAction}
              disabled={isPending}
              title={actionTakenAt ? "Clear action pending" : "Mark action taken"}
              className={cn(
                "ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors",
                actionTakenAt
                  ? "text-blue-500 hover:text-blue-700"
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              <Flag className={cn("h-3 w-3", actionTakenAt && "fill-current")} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
