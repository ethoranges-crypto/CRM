"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DealCardDialog } from "./deal-card-dialog"
import { businessDaysSince } from "@/lib/business-days"
import type { DealWithNotes, Label } from "../types"

interface TodayStaleDealCardProps {
  deal: DealWithNotes
  allLabels: Label[]
  canEdit: boolean
}

export function TodayStaleDealCard({ deal, allLabels, canEdit }: TodayStaleDealCardProps) {
  const [open, setOpen] = useState(false)
  const days = deal.actionTakenAt ? businessDaysSince(deal.actionTakenAt) : 0

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <CardContent className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{deal.company ?? deal.alias}</p>
              {deal.company && (
                <span className="text-xs text-muted-foreground">{deal.alias}</span>
              )}
            </div>
            {deal.actionNote && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {deal.actionNote}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
          >
            {days} business day{days !== 1 ? "s" : ""}
          </Badge>
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
