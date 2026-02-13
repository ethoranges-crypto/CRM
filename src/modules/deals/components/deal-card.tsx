"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DealWithNotes } from "../types"

interface DealCardProps {
  deal: DealWithNotes
  columnId?: string
  isOverlay?: boolean
  onClick?: () => void
}

export function DealCard({
  deal,
  columnId,
  isOverlay,
  onClick,
}: DealCardProps) {
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
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
        isOverlay && "shadow-lg ring-2 ring-primary",
        onClick && "cursor-pointer"
      )}
    >
      <CardContent className="space-y-1.5 p-3">
        {/* Labels */}
        {deal.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.labels.map((label) => (
              <span
                key={label.id}
                className="inline-block h-2 w-8 rounded-full"
                style={{ backgroundColor: label.color }}
                title={label.name}
              />
            ))}
          </div>
        )}

        <p className="text-sm font-medium">{deal.alias}</p>
        {deal.company && (
          <p className="text-xs text-muted-foreground">{deal.company}</p>
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
        </div>
      </CardContent>
    </Card>
  )
}
