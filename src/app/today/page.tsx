import { getColumnsWithDeals, getLabels } from "@/modules/deals/actions"
import { getCanEdit } from "@/lib/auth"
import { seed } from "@/lib/seed"
import { businessDaysSince, daysUntil } from "@/lib/business-days"
import { formatDate } from "@/lib/format-date"
import { getActiveDeals, getDealsWithNextStep } from "@/modules/deals/follow-up-rules"
import { TodayDealSpotlightCard } from "@/modules/deals/components/today-deal-spotlight-card"
import {
  NextStepQuickActions,
  StaleActionQuickActions,
} from "@/modules/deals/components/today-quick-actions"
import { NotificationBanner } from "@/modules/deals/components/notification-banner"
import { TodaySection } from "@/components/ui/today-section"
import { CollapsibleSection } from "@/components/ui/collapsible-section"

export const dynamic = "force-dynamic"

const STALE_ACTION_BUSINESS_DAYS = 3

export default async function TodayPage() {
  await seed()

  const [columns, allLabels, canEdit] = await Promise.all([
    getColumnsWithDeals(),
    getLabels(),
    getCanEdit(),
  ])

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)
  const weekFromMidnight = new Date(todayMidnight)
  weekFromMidnight.setDate(weekFromMidnight.getDate() + 7)

  const activeDeals = getActiveDeals(columns)
  const dealsWithNextStep = getDealsWithNextStep(activeDeals)

  const overdueDeals = dealsWithNextStep.filter((d) => d.nextActionDate < todayMidnight)
  const dueTodayDeals = dealsWithNextStep.filter(
    (d) => d.nextActionDate >= todayMidnight && d.nextActionDate < tomorrowMidnight
  )
  const dueThisWeekDeals = dealsWithNextStep.filter(
    (d) => d.nextActionDate >= tomorrowMidnight && d.nextActionDate < weekFromMidnight
  )
  const laterDeals = dealsWithNextStep.filter((d) => d.nextActionDate >= weekFromMidnight)

  const staleDeals = activeDeals
    .filter(
      (d) => d.actionTakenAt && businessDaysSince(d.actionTakenAt) >= STALE_ACTION_BUSINESS_DAYS
    )
    .sort(
      (a, b) =>
        businessDaysSince(b.actionTakenAt as Date) -
        businessDaysSince(a.actionTakenAt as Date)
    )

  const totalCount =
    overdueDeals.length +
    dueTodayDeals.length +
    dueThisWeekDeals.length +
    staleDeals.length +
    laterDeals.length

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

        {overdueDeals.length > 0 && (
          <TodaySection title="Overdue" count={overdueDeals.length} className="text-destructive">
            {overdueDeals.map((deal) => (
              <TodayDealSpotlightCard
                key={deal.id}
                deal={deal}
                allLabels={allLabels}
                canEdit={canEdit}
                subtitle={deal.nextAction ?? undefined}
                badgeText={`Overdue — ${formatDate(deal.nextActionDate)}`}
                badgeVariant="destructive"
                quickActions={
                  <NextStepQuickActions
                    dealId={deal.id}
                    nextAction={deal.nextAction}
                    nextActionDate={deal.nextActionDate}
                  />
                }
                daysUntil={daysUntil(deal.nextActionDate)}
              />
            ))}
          </TodaySection>
        )}

        {dueTodayDeals.length > 0 && (
          <TodaySection title="Due Today" count={dueTodayDeals.length}>
            {dueTodayDeals.map((deal) => (
              <TodayDealSpotlightCard
                key={deal.id}
                deal={deal}
                allLabels={allLabels}
                canEdit={canEdit}
                subtitle={deal.nextAction ?? undefined}
                badgeText={formatDate(deal.nextActionDate)}
                badgeVariant="outline"
                quickActions={
                  <NextStepQuickActions
                    dealId={deal.id}
                    nextAction={deal.nextAction}
                    nextActionDate={deal.nextActionDate}
                  />
                }
                daysUntil={daysUntil(deal.nextActionDate)}
              />
            ))}
          </TodaySection>
        )}

        {dueThisWeekDeals.length > 0 && (
          <TodaySection title="Due This Week" count={dueThisWeekDeals.length}>
            {dueThisWeekDeals.map((deal) => (
              <TodayDealSpotlightCard
                key={deal.id}
                deal={deal}
                allLabels={allLabels}
                canEdit={canEdit}
                subtitle={deal.nextAction ?? undefined}
                badgeText={formatDate(deal.nextActionDate)}
                badgeVariant="outline"
                quickActions={
                  <NextStepQuickActions
                    dealId={deal.id}
                    nextAction={deal.nextAction}
                    nextActionDate={deal.nextActionDate}
                  />
                }
                daysUntil={daysUntil(deal.nextActionDate)}
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

        {laterDeals.length > 0 && (
          <CollapsibleSection
            title="Later"
            count={laterDeals.length}
            defaultOpen={false}
            headingClassName="text-muted-foreground"
          >
            {laterDeals.map((deal) => (
              <TodayDealSpotlightCard
                key={deal.id}
                deal={deal}
                allLabels={allLabels}
                canEdit={canEdit}
                subtitle={deal.nextAction ?? undefined}
                badgeText={formatDate(deal.nextActionDate)}
                badgeVariant="outline"
                quickActions={
                  <NextStepQuickActions
                    dealId={deal.id}
                    nextAction={deal.nextAction}
                    nextActionDate={deal.nextActionDate}
                  />
                }
                daysUntil={daysUntil(deal.nextActionDate)}
              />
            ))}
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}
