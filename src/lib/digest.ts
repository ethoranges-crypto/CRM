import { getColumnsWithDeals } from "@/modules/deals/actions"
import { businessDaysSince, todayMidnight, addDays } from "@/lib/business-days"
import { formatDate } from "@/lib/format-date"
import { getActiveDeals, getDealsWithNextStep, type DealWithNextStep } from "@/modules/deals/follow-up-rules"

const STALE_ACTION_BUSINESS_DAYS = 3

export type DigestStaleDeal = {
  id: string
  alias: string
  company: string | null
  actionNote: string | null
  businessDays: number
}

export type DigestData = {
  overdue: DealWithNextStep[]
  dueToday: DealWithNextStep[]
  dueThisWeek: DealWithNextStep[]
  staleActionDeals: DigestStaleDeal[]
}

export async function getDigestData(): Promise<DigestData> {
  const start = todayMidnight()
  const tomorrow = addDays(start, 1)
  const weekFromNow = addDays(start, 7)

  // One fetch, shared with the Today dashboard's own data source, so the
  // digest and the dashboard can never drift out of sync on what counts as
  // active/overdue/due-soon.
  const columns = await getColumnsWithDeals()
  const allDeals = columns.flatMap((c) => c.deals)
  const activeDeals = getActiveDeals(columns)
  const dealsWithNextStep = getDealsWithNextStep(activeDeals)

  const overdue = dealsWithNextStep.filter((d) => d.nextActionDate.getTime() < start.getTime())
  const dueToday = dealsWithNextStep.filter(
    (d) => d.nextActionDate.getTime() >= start.getTime() && d.nextActionDate.getTime() < tomorrow.getTime()
  )
  const dueThisWeek = dealsWithNextStep.filter(
    (d) => d.nextActionDate.getTime() >= tomorrow.getTime() && d.nextActionDate.getTime() < weekFromNow.getTime()
  )

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

  return { overdue, dueToday, dueThisWeek, staleActionDeals }
}

export function formatDigestMessage(data: DigestData): string {
  const { overdue, dueToday, dueThisWeek, staleActionDeals } = data
  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const totalItems = overdue.length + dueToday.length + dueThisWeek.length + staleActionDeals.length

  const lines: string[] = [`CRM Digest — ${dateStr}`]

  if (totalItems === 0) {
    lines.push("", "Nothing due. You're clear.")
    return lines.join("\n")
  }

  const dealLabel = (d: { alias: string; company: string | null }) =>
    d.company ? `${d.company} (${d.alias})` : d.alias

  if (overdue.length > 0) {
    lines.push("", `OVERDUE (${overdue.length})`)
    for (const d of overdue) {
      lines.push(`- ${dealLabel(d)}: ${d.nextAction ?? "(no next step text)"} — was due ${formatDate(d.nextActionDate)}`)
    }
  }

  if (dueToday.length > 0) {
    lines.push("", `DUE TODAY (${dueToday.length})`)
    for (const d of dueToday) {
      lines.push(`- ${dealLabel(d)}: ${d.nextAction ?? "(no next step text)"}`)
    }
  }

  if (dueThisWeek.length > 0) {
    lines.push("", `NEXT STEP DUE THIS WEEK (${dueThisWeek.length})`)
    for (const d of dueThisWeek) {
      lines.push(`- ${dealLabel(d)}: ${d.nextAction ?? "(no next step text)"} — due ${formatDate(d.nextActionDate)}`)
    }
  }

  if (staleActionDeals.length > 0) {
    lines.push("", `STALE ACTION ITEMS (${staleActionDeals.length})`)
    for (const d of staleActionDeals) {
      const suffix = d.actionNote ? `: ${d.actionNote}` : ""
      lines.push(`- ${dealLabel(d)} — ${d.businessDays} business day${d.businessDays !== 1 ? "s" : ""}${suffix}`)
    }
  }

  return lines.join("\n")
}

// Telegram's hard limit is 4096 UTF-16 code units per message; a busy day
// across multiple sections can plausibly exceed that, and an oversized
// send fails outright with nothing delivered — exactly when the digest
// matters most. Split on section boundaries (blank lines) so a section's
// bullet list never gets cut mid-way if avoidable.
const TELEGRAM_MAX_MESSAGE_LENGTH = 3500

export function chunkDigestMessage(message: string): string[] {
  if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return [message]

  const sections = message.split("\n\n")
  const chunks: string[] = []
  let current = ""

  for (const section of sections) {
    const candidate = current ? `${current}\n\n${section}` : section
    if (candidate.length > TELEGRAM_MAX_MESSAGE_LENGTH && current) {
      chunks.push(current)
      current = section
    } else {
      current = candidate
    }
    // A single section longer than the limit on its own (many dozens of
    // items): hard-split by character count as a last resort.
    while (current.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      chunks.push(current.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH))
      current = current.slice(TELEGRAM_MAX_MESSAGE_LENGTH)
    }
  }
  if (current) chunks.push(current)

  return chunks.length > 1
    ? chunks.map((c, i) => `(${i + 1}/${chunks.length})\n${c}`)
    : chunks
}
