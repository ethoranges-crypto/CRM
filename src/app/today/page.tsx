import {
  getColumnsWithDeals,
  getAllActiveReminders,
  getLabels,
} from "@/modules/deals/actions"
import { getTodos } from "@/modules/todos/actions"
import { getCanEdit } from "@/lib/auth"
import { businessDaysSince } from "@/lib/business-days"
import { ReminderPageRow } from "@/modules/deals/components/reminder-page-row"
import { TodayStaleDealCard } from "@/modules/deals/components/today-stale-deal-card"
import { TodayTodoRow } from "@/modules/todos/components/today-todo-row"
import { NotificationBanner } from "@/modules/deals/components/notification-banner"

export const dynamic = "force-dynamic"

const STALE_ACTION_BUSINESS_DAYS = 3

export default async function TodayPage() {
  const [columns, reminders, todos, allLabels, canEdit] = await Promise.all([
    getColumnsWithDeals(),
    getAllActiveReminders(),
    getTodos(),
    getLabels(),
    getCanEdit(),
  ])

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const tomorrowMidnight = new Date(todayMidnight)
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1)

  const activeReminders = reminders.filter((r) => r.reminder.status === "active")
  const overdue = activeReminders.filter(
    (r) => new Date(r.reminder.dueAt) < todayMidnight
  )
  const dueToday = activeReminders.filter((r) => {
    const due = new Date(r.reminder.dueAt)
    return due >= todayMidnight && due < tomorrowMidnight
  })

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

  const urgentTodos = todos.filter((t) => t.isUrgent && !t.isCompleted)

  const totalCount =
    overdue.length + dueToday.length + staleDeals.length + urgentTodos.length

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
          <section>
            <h2 className="mb-3 text-sm font-semibold text-destructive">
              Overdue ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map((r) => (
                <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
              ))}
            </div>
          </section>
        )}

        {dueToday.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              Due Today ({dueToday.length})
            </h2>
            <div className="space-y-2">
              {dueToday.map((r) => (
                <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
              ))}
            </div>
          </section>
        )}

        {staleDeals.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-600 dark:text-amber-500">
              Stale Action Items ({staleDeals.length})
            </h2>
            <div className="space-y-2">
              {staleDeals.map((deal) => (
                <TodayStaleDealCard
                  key={deal.id}
                  deal={deal}
                  allLabels={allLabels}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </section>
        )}

        {urgentTodos.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-500">
              Urgent To-Dos ({urgentTodos.length})
            </h2>
            <div className="space-y-2">
              {urgentTodos.map((todo) => (
                <TodayTodoRow key={todo.id} todo={todo} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
