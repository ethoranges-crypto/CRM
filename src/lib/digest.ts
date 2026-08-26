import { db } from "@/lib/db"
import { deals, dealReminders } from "@/modules/deals/schema"
import { todos } from "@/modules/todos/schema"
import { eq, and, lt, gte, isNotNull } from "drizzle-orm"
import { businessDaysSince } from "@/lib/business-days"

const STALE_ACTION_BUSINESS_DAYS = 3

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function tomorrowMidnight(): Date {
  const d = todayMidnight()
  d.setDate(d.getDate() + 1)
  return d
}

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
  urgentTodos: { id: string; text: string }[]
}

export async function getDigestData(): Promise<DigestData> {
  const start = todayMidnight()
  const end = tomorrowMidnight()

  const [overdueRows, dueTodayRows, pendingActionDeals, urgentTodoRows] =
    await Promise.all([
      db
        .select({
          id: dealReminders.id,
          note: dealReminders.note,
          dueAt: dealReminders.dueAt,
          dealAlias: deals.alias,
          dealCompany: deals.company,
        })
        .from(dealReminders)
        .innerJoin(deals, eq(deals.id, dealReminders.dealId))
        .where(and(eq(dealReminders.status, "active"), lt(dealReminders.dueAt, start))),
      db
        .select({
          id: dealReminders.id,
          note: dealReminders.note,
          dueAt: dealReminders.dueAt,
          dealAlias: deals.alias,
          dealCompany: deals.company,
        })
        .from(dealReminders)
        .innerJoin(deals, eq(deals.id, dealReminders.dealId))
        .where(
          and(
            eq(dealReminders.status, "active"),
            gte(dealReminders.dueAt, start),
            lt(dealReminders.dueAt, end)
          )
        ),
      db.select().from(deals).where(isNotNull(deals.actionTakenAt)),
      db
        .select({ id: todos.id, text: todos.text })
        .from(todos)
        .where(and(eq(todos.isUrgent, true), eq(todos.isCompleted, false))),
    ])

  const staleActionDeals: DigestStaleDeal[] = pendingActionDeals
    .filter((d) => d.actionTakenAt && businessDaysSince(d.actionTakenAt) >= STALE_ACTION_BUSINESS_DAYS)
    .map((d) => ({
      id: d.id,
      alias: d.alias,
      company: d.company,
      actionNote: d.actionNote,
      businessDays: businessDaysSince(d.actionTakenAt as Date),
    }))
    .sort((a, b) => b.businessDays - a.businessDays)

  return {
    overdue: overdueRows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
    dueToday: dueTodayRows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
    staleActionDeals,
    urgentTodos: urgentTodoRows,
  }
}

export function formatDigestMessage(data: DigestData): string {
  const { overdue, dueToday, staleActionDeals, urgentTodos } = data
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const totalItems =
    overdue.length + dueToday.length + staleActionDeals.length + urgentTodos.length

  const lines: string[] = [`CRM Digest — ${dateStr}`]

  if (totalItems === 0) {
    lines.push("", "Nothing due. You're clear.")
    return lines.join("\n")
  }

  const dealLabel = (d: { dealAlias: string; dealCompany: string | null }) =>
    d.dealCompany ? `${d.dealCompany} (${d.dealAlias})` : d.dealAlias

  if (overdue.length > 0) {
    lines.push("", `OVERDUE (${overdue.length})`)
    for (const r of overdue) {
      lines.push(`- ${dealLabel(r)}: ${r.note}`)
    }
  }

  if (dueToday.length > 0) {
    lines.push("", `DUE TODAY (${dueToday.length})`)
    for (const r of dueToday) {
      lines.push(`- ${dealLabel(r)}: ${r.note}`)
    }
  }

  if (staleActionDeals.length > 0) {
    lines.push("", `STALE ACTION ITEMS (${staleActionDeals.length})`)
    for (const d of staleActionDeals) {
      const label = d.company ? `${d.company} (${d.alias})` : d.alias
      const suffix = d.actionNote ? `: ${d.actionNote}` : ""
      lines.push(`- ${label} — ${d.businessDays} business day${d.businessDays !== 1 ? "s" : ""}${suffix}`)
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
