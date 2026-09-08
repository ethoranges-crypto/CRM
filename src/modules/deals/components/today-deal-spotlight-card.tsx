"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DealCardDialog } from "./deal-card-dialog"
import { cn } from "@/lib/utils"
import type { DealWithNotes, Label } from "../types"

interface TodayDealSpotlightCardProps {
  deal: DealWithNotes
  allLabels: Label[]
  canEdit: boolean
  badgeText: string
  badgeVariant?: "default" | "destructive" | "outline" | "secondary"
  badgeClassName?: string
  subtitle?: string
  quickActions?: React.ReactNode
  // Calendar days until due (negative = overdue, 0 = today) — shown as a
  // large number under the date badge so urgency reads at a glance without
  // having to work the date out yourself.
  daysUntil?: number
}

// Generic "deal card that opens the full dialog on click" row shared by the
// Today dashboard's due-soon, going-cold, resurfaced, and stale-action
// sections. quickActions renders below the row (each action stops click
// propagation itself, so it doesn't also open the dialog) — this is what
// lets a card be dismissed/rescheduled without opening the full dialog.
export function TodayDealSpotlightCard({
  deal,
  allLabels,
  canEdit,
  badgeText,
  badgeVariant = "outline",
  badgeClassName,
  subtitle,
  quickActions,
  daysUntil,
}: TodayDealSpotlightCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{deal.company ?? deal.alias}</p>
                {deal.company && (
                  <span className="text-xs text-muted-foreground">{deal.alias}</span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={badgeVariant} className={badgeClassName}>
                {badgeText}
              </Badge>
              {daysUntil !== undefined && (
                <span
                  className={cn(
                    "text-2xl font-bold leading-none tabular-nums",
                    daysUntil < 0
                      ? "text-destructive"
                      : daysUntil === 0
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-foreground"
                  )}
                >
                  {daysUntil}
                </span>
              )}
            </div>
          </div>
          {canEdit && quickActions}
        </CardContent>
      </Card>

      <DealCardDialog
        deal={deal}
        allLabels={allLabels}
        canEdit={canEdit}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
