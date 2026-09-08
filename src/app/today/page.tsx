import {
  getColumnsWithDeals,
  getAllActiveReminders,
  getLabels,
} from "@/modules/deals/actions"
import { getCanEdit } from "@/lib/auth"
import { seed } from "@/lib/seed"
import { businessDaysSince } from "@/lib/business-days"
import { formatDate } from "@/lib/format-date"
import { getActiveDeals, getDueSoonDeals } from "@/modules/deals/follow-up-rules"
import { ReminderPageRow } from "@/modules/deals/components/reminder-page-row"
import { TodayDealSpotlightCard } from "@/modules/deals/components/today-deal-spotlight-card"
import {
  DueSoonQuickActions,
  StaleActionQuickActions,
} from "@/modules/deals/components/today-quick-actions"
import { NotificationBanner } from "@/modules/deals/components/notification-banner"
import { TodaySection } from "@/components/ui/today-section"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

export const dynamic = "force-dynamic"

const STALE_ACTION_BUSINESS_DAYS = 3

export default async function TodayPage() {
  await seed()

  const [columns, reminders, allLabels, canEdit] = await Promise.all([
    getColumnsWithDeals(),
    getAllActiveReminders(),
    getLabels(),
    getCanEdit(),
  ])

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)
  const weekFromMidnight = new Date(todayMidnight)
  weekFromMidnight.setDate(weekFromMidnight.getDate() + 7)

  const activeReminders = reminders.filter((r) => r.reminder.status === "active")
  const overdue = activeReminders.filter(
    (r) => new Date(r.reminder.dueAt) < todayMidnight
  )
  const dueToday = activeReminders.filter((r) => {
    const due = new Date(r.reminder.dueAt)
    return due >= todayMidnight && due < tomorrowMidnight
  })
  const dueThisWeek = activeReminders.filter((r) => {
    const due = new Date(r.reminder.dueAt)
    return due >= tomorrowMidnight && due < weekFromMidnight
  })
  const dueLater = activeReminders.filter(
    (r) => new Date(r.reminder.dueAt) >= weekFromMidnight
  )
  const pausedReminders = reminders.filter((r) => r.reminder.status === "paused")

  const staleDeals = columns
    .flatMap((c) => c.deals)
    .filter(
      (d) => d.actionTakenAt && businessDaysSince(d.actionTakenAt) >= STALE_ACTION_BUSINESS_DAYS
    )
    .sort(
      (a, b) =>
        businessDaysSince(b.actionTakenAt as Date) -
        businessDaysSince(a.actionTakenAt as Date)
    )

  const activeDeals = getActiveDeals(columns)
  const dueSoonDeals = getDueSoonDeals(activeDeals)

  const totalCount =
    overdue.length +
    dueToday.length +
    dueSoonDeals.length +
    staleDeals.length +
    dueThisWeek.length +
    dueLater.length +
    pausedReminders.length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-muted-foreground">
          Everything that needs your attention right now.
        </p>
      </div>
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <NotificationBanner />

        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing due today. You&rsquo;re clear.
            </p>
          </div>
        )}

        {overdue.length > 0 && (
          <TodaySection title="Overdue" count={overdue.length} className="text-destructive">
            {overdue.map((r) => (
              <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
            ))}
          </TodaySection>
        )}

        {dueToday.length > 0 && (
          <TodaySection title="Due Today" count={dueToday.length}>
            {dueToday.map((r) => (
              <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
            ))}
          </TodaySection>
        )}

        {dueSoonDeals.length > 0 && (
          <TodaySection title="Due in 7 days or less" count={dueSoonDeals.length}>
            {dueSoonDeals.map((deal) => (
              <TodayDealSpotlightCard
                key={deal.id}
                deal={deal}
                allLabels={allLabels}
                canEdit={canEdit}
                subtitle={deal.nextAction ?? undefined}
                badgeText={
                  deal.overdue
                    ? `Overdue — ${formatDate(deal.nextActionDate as Date)}`
                    : formatDate(deal.nextActionDate as Date)
                }
                badgeVariant={deal.overdue ? "destructive" : "outline"}
                quickActions={<DueSoonQuickActions dealId={deal.id} />}
              />
            ))}
          </TodaySection>
        )}

        {staleDeals.length > 0 && (
          <TodaySection
            title="Stale Action Items"
            count={staleDeals.length}
            className="text-amber-600 dark:text-amber-500"
          >
            {staleDeals.map((deal) => {
              const days = businessDaysSince(deal.actionTakenAt as Date)
              return (
                <TodayDealSpotlightCard
                  key={deal.id}
                  deal={deal}
                  allLabels={allLabels}
                  canEdit={canEdit}
                  subtitle={deal.actionNote ?? undefined}
                  badgeText={`${days} business day${days !== 1 ? "s" : ""}`}
                  badgeClassName="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                  quickActions={<StaleActionQuickActions dealId={deal.id} />}
                />
              )
            })}
          </TodaySection>
        )}

        {dueThisWeek.length > 0 && (
          <CollapsibleSection title="Reminders This Week" count={dueThisWeek.length} defaultOpen>
            {dueThisWeek.map((r) => (
              <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
            ))}
          </CollapsibleSection>
        )}

        {dueLater.length > 0 && (
          <CollapsibleSection
            title="Reminders Later"
            count={dueLater.length}
            defaultOpen={false}
            headingClassName="text-muted-foreground"
          >
            {dueLater.map((r) => (
              <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
            ))}
          </CollapsibleSection>
        )}

        {pausedReminders.length > 0 && (
          <CollapsibleSection
            title="Paused Reminders"
            count={pausedReminders.length}
            defaultOpen={false}
            headingClassName="text-muted-foreground"
          >
            {pausedReminders.map((r) => (
              <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
            ))}
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}
