import type { ColumnWithDeals, DealWithNotes } from "./types"

// "Active" = not Won, not Lost.
export function getActiveDeals(columns: ColumnWithDeals[]): DealWithNotes[] {
  return columns.filter((c) => c.outcome === "open").flatMap((c) => c.deals)
}

export type DealWithNextStep = DealWithNotes & { nextActionDate: Date }

// Every deal with a next step set, soonest first. The Today dashboard buckets
// these by date (overdue / today / this week / later) itself.
export function getDealsWithNextStep(activeDeals: DealWithNotes[]): DealWithNextStep[] {
  return activeDeals
    .filter((d): d is DealWithNextStep => !!d.nextActionDate)
    .sort((a, b) => a.nextActionDate.getTime() - b.nextActionDate.getTime())
}
