import { getColumnsWithDeals } from "@/modules/deals/actions"
import { db } from "@/lib/db"
import { todos } from "@/modules/todos/schema"
import { eq, and } from "drizzle-orm"
import { businessDaysSince, daysSince, todayMidnight, addDays } from "@/lib/business-days"
import { formatDate } from "@/lib/format-date"
import {
  getActiveDeals,
  getDueSoonDeals,
  getColdDeals,
  getResurfacedDeals,
  type DueSoonDeal,
} from "@/modules/deals/follow-up-rules"
import type { DealWithNotes } from "@/modules/deals/types"

const STALE_ACTION_BUSINESS_DAYS = 3

export type DigestReminder = {
  id: string
  note: string
  dueAt: Date
  dealAlias: string
  dealCompany: string | null
}

export type DigestStaleDeal = {
  id: string
  alias: string
  company: string | null
  actionNote: string | null
  businessDays: number
}

export type DigestData = {
  overdue: DigestReminder[]
  dueToday: DigestReminder[]
  staleActionDeals: DigestStaleDeal[]
  dueSoonDeals: DueSoonDeal[]
  coldDeals: DealWithNotes[]
  resurfacedDeals: DealWithNotes[]
  urgentTodos: { id: string; text: string }[]
}

export async function getDigestData(): Promise<DigestData> {
  const start = todayMidnight()
  const end = addDays(start, 1)

  // One fetch, shared with the Today dashboard's own data source, so the
  // digest and the dashboard can never drift out of sync on what counts as
  // active/due-soon/cold/resurfaced.
  const columns = await getColumnsWithDeals()
  const allDeals = columns.flatMap((c) => c.deals)
  const activeDeals = getActiveDeals(columns)

  const allReminders: DigestReminder[] = allDeals.flatMap((d) =>
    d.reminders
      .filter((r) => r.status === "active")
      .map((r) => ({
        id: r.id,
        note: r.note,
        dueAt: r.dueAt,
        dealAlias: d.alias,
        dealCompany: d.company,
      }))
  )

  const overdue = allReminders
    .filter((r) => r.dueAt.getTime() < start.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  const dueToday = allReminders
    .filter((r) => r.dueAt.getTime() >= start.getTime() && r.dueAt.getTime() < end.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())

  const staleActionDeals: DigestStaleDeal[] = allDeals
    .filter((d) => d.actionTakenAt && businessDaysSince(d.actionTakenAt) >= STALE_ACTION_BUSINESS_DAYS)
    .map((d) => ({
      id: d.id,
      alias: d.alias,
      company: d.company,
      actionNote: d.actionNote,
      businessDays: businessDaysSince(d.actionTakenAt as Date),
    }))
    .sort((a, b) => b.businessDays - a.businessDays)

  const urgentTodoRows = await db
    .select({ id: todos.id, text: todos.text })
    .from(todos)
    .where(and(eq(todos.isUrgent, true), eq(todos.isCompleted, false)))

  return {
    overdue,
    dueToday,
    staleActionDeals,
    dueSoonDeals: getDueSoonDeals(activeDeals),
    coldDeals: getColdDeals(activeDeals),
    resurfacedDeals: getResurfacedDeals(activeDeals),
    urgentTodos: urgentTodoRows,
  }
}

export function formatDigestMessage(data: DigestData): string {
  const { overdue, dueToday, staleActionDeals, dueSoonDeals, coldDeals, resurfacedDeals, urgentTodos } = data
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const totalItems =
    overdue.length +
    dueToday.length +
    staleActionDeals.length +
    dueSoonDeals.length +
    coldDeals.length +
    resurfacedDeals.length +
    urgentTodos.length

  const lines: string[] = [`CRM Digest — ${dateStr}`]

  if (totalItems === 0) {
    lines.push("", "Nothing due. You're clear.")
    return lines.join("\n")
  }

  const dealLabel = (d: { alias: string; company: string | null }) =>
    d.company ? `${d.company} (${d.alias})` : d.alias
  const reminderDealLabel = (d: { dealAlias: string; dealCompany: string | null }) =>
    d.dealCompany ? `${d.dealCompany} (${d.dealAlias})` : d.dealAlias

  if (overdue.length > 0) {
    lines.push("", `OVERDUE (${overdue.length})`)
    for (const r of overdue) {
      lines.push(`- ${reminderDealLabel(r)}: ${r.note}`)
    }
  }

  if (dueToday.length > 0) {
    lines.push("", `DUE TODAY (${dueToday.length})`)
    for (const r of dueToday) {
      lines.push(`- ${reminderDealLabel(r)}: ${r.note}`)
    }
  }

  if (dueSoonDeals.length > 0) {
    lines.push("", `NEXT ACTION DUE IN 7 DAYS OR LESS (${dueSoonDeals.length})`)
    for (const d of dueSoonDeals) {
      const dateLabel = d.overdue
        ? `OVERDUE (was due ${formatDate(d.nextActionDate as Date)})`
        : `due ${formatDate(d.nextActionDate as Date)}`
      lines.push(`- ${dealLabel(d)}: ${d.nextAction ?? "(no next action text)"} — ${dateLabel}`)
    }
  }

  if (resurfacedDeals.length > 0) {
    lines.push("", `RESURFACED (${resurfacedDeals.length})`)
    for (const d of resurfacedDeals) {
      lines.push(`- ${dealLabel(d)} — snoozed until ${formatDate(d.snoozeUntil as Date)}`)
    }
  }

  if (coldDeals.length > 0) {
    lines.push("", `GOING COLD — NOT CONTACTED IN 14+ DAYS (${coldDeals.length})`)
    for (const d of coldDeals) {
      const effective = d.lastContactedAt ?? d.createdAt
      const days = daysSince(effective)
      const label = d.lastContactedAt
        ? `${days}d since last contact`
        : `never logged, ${days}d since created`
      lines.push(`- ${dealLabel(d)} — ${label}`)
    }
  }

  if (staleActionDeals.length > 0) {
    lines.push("", `STALE ACTION ITEMS (${staleActionDeals.length})`)
    for (const d of staleActionDeals) {
      const suffix = d.actionNote ? `: ${d.actionNote}` : ""
      lines.push(`- ${dealLabel(d)} — ${d.businessDays} business day${d.businessDays !== 1 ? "s" : ""}${suffix}`)
    }
  }

  if (urgentTodos.length > 0) {
    lines.push("", `URGENT TO-DOS (${urgentTodos.length})`)
    for (const t of urgentTodos) {
      lines.push(`- ${t.text}`)
    }
  }

  return lines.join("\n")
}
