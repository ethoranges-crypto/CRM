import { todayMidnight, addDays, isOverdue } from "@/lib/business-days"
import type { ColumnWithDeals, DealWithNotes } from "./types"

export const DUE_SOON_DAYS = 7

// "Active" = not Won, not Lost.
export function getActiveDeals(columns: ColumnWithDeals[]): DealWithNotes[] {
  return columns.filter((c) => c.outcome === "open").flatMap((c) => c.deals)
}

export type DueSoonDeal = DealWithNotes & { overdue: boolean }

// Active deals with a next-action date within DUE_SOON_DAYS, overdue ones
// first, then soonest-first.
export function getDueSoonDeals(activeDeals: DealWithNotes[]): DueSoonDeal[] {
  const horizon = addDays(todayMidnight(), DUE_SOON_DAYS)

  return activeDeals
    .filter((d): d is DealWithNotes & { nextActionDate: Date } =>
      !!d.nextActionDate && d.nextActionDate.getTime() <= horizon.getTime()
    )
    .map((d) => ({ ...d, overdue: isOverdue(d.nextActionDate) }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      return a.nextActionDate!.getTime() - b.nextActionDate!.getTime()
    })
}
