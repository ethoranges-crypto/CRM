import { checkTelegramAuth, getGroups } from "@/modules/telegram/actions"
import { GroupCard } from "@/modules/telegram/components/group-card"
import { SyncGroupButton } from "@/modules/telegram/components/sync-group-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getCanEdit } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const [isAuthed, canEdit] = await Promise.all([
    checkTelegramAuth(),
    getCanEdit(),
  ])

  if (!isAuthed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Telegram Not Connected</h2>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "Connect your Telegram account to sync groups."
            : "Telegram has not been connected yet."}
        </p>
        {canEdit && (
          <Link href="/telegram/auth">
            <Button>Connect Telegram</Button>
          </Link>
        )}
      </div>
    )
  }

  const groups = await getGroups()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Telegram Groups</h1>
        {canEdit && <SyncGroupButton />}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No groups synced yet.{" "}
              {canEdit
                ? 'Click "Sync All Groups" to discover your groups, or enter a group username manually.'
                : ""}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
