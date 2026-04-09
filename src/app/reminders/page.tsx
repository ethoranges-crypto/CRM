import { getAllActiveReminders } from "@/modules/deals/actions"
import { ReminderPageRow } from "@/modules/deals/components/reminder-page-row"
import { NotificationBanner } from "@/modules/deals/components/notification-banner"
import { getCanEdit } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function RemindersPage() {
  const [reminders, canEdit] = await Promise.all([
    getAllActiveReminders(),
    getCanEdit(),
  ])

  const now = new Date()

  const dueReminders = reminders.filter(
    (r) => r.reminder.status === "active" && new Date(r.reminder.dueAt) <= now
  )
  const upcomingReminders = reminders.filter(
    (r) => r.reminder.status === "active" && new Date(r.reminder.dueAt) > now
  )
  const pausedReminders = reminders.filter(
    (r) => r.reminder.status === "paused"
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Reminders</h1>
      </div>
      <div className="flex-1 space-y-6 overflow-auto p-6">
        <NotificationBanner />

        {dueReminders.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-destructive">
              Due Now ({dueReminders.length})
            </h2>
            <div className="space-y-2">
              {dueReminders.map((r) => (
                <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
              ))}
            </div>
          </section>
        )}

        {upcomingReminders.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold">
              Upcoming ({upcomingReminders.length})
            </h2>
            <div className="space-y-2">
              {upcomingReminders.map((r) => (
                <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
              ))}
            </div>
          </section>
        )}

        {pausedReminders.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Paused ({pausedReminders.length})
            </h2>
            <div className="space-y-2">
              {pausedReminders.map((r) => (
                <ReminderPageRow key={r.reminder.id} data={r} canEdit={canEdit} />
              ))}
            </div>
          </section>
        )}

        {reminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No active reminders. Add reminders from deal cards in the pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
