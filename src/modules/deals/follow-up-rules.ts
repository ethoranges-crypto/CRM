import { todayMidnight, addDays, isOverdue } from "@/lib/business-days"
import type { ColumnWithDeals, DealWithNotes } from "./types"

export const DUE_SOON_DAYS = 7
export const COLD_AFTER_DAYS = 14

export function isSnoozed(deal: { snoozeUntil: Date | null }): boolean {
  return !!deal.snoozeUntil && deal.snoozeUntil.getTime() > Date.now()
}

// A deal whose snooze date has arrived (or passed) and hasn't been
// re-snoozed or cleared yet — it should come back to the user's attention.
export function isResurfaced(deal: { snoozeUntil: Date | null }): boolean {
  return !!deal.snoozeUntil && deal.snoozeUntil.getTime() <= Date.now()
}

// "Active" = not Won, not Lost, and not currently snoozed. A deal whose
// snooze date has already passed counts as active again (it's "resurfaced",
// not "snoozed") so it naturally re-enters the due-soon/cold checks below.
export function getActiveDeals(columns: ColumnWithDeals[]): DealWithNotes[] {
  return columns
    .filter((c) => c.outcome === "open")
    .flatMap((c) => c.deals)
    .filter((d) => !isSnoozed(d))
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

// Active deals not contacted in over COLD_AFTER_DAYS, oldest effective
// contact first. A deal with no logged contact yet uses its creation date
// as the best available stand-in.
export function getColdDeals(activeDeals: DealWithNotes[]): DealWithNotes[] {
  const threshold = addDays(todayMidnight(), -COLD_AFTER_DAYS)

  const effectiveContactDate = (d: DealWithNotes) => d.lastContactedAt ?? d.createdAt

  return activeDeals
    .filter((d) => effectiveContactDate(d).getTime() < threshold.getTime())
    .sort((a, b) => effectiveContactDate(a).getTime() - effectiveContactDate(b).getTime())
}

// Active deals whose snooze has just (or previously) ended, most recently
// resurfaced first. Stays in this list until the snooze date is cleared or
// updated — there's no separate "acknowledged" state.
export function getResurfacedDeals(activeDeals: DealWithNotes[]): DealWithNotes[] {
  return activeDeals
    .filter((d) => isResurfaced(d))
    .sort((a, b) => a.snoozeUntil!.getTime() - b.snoozeUntil!.getTime())
}
