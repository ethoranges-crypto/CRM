import { getContacts, getGroupById, getGroupIndexStats } from "@/modules/telegram/actions"
import { ContactsTable } from "@/modules/telegram/components/contacts-table"
import { BioIndexButton } from "@/modules/telegram/components/bio-index-button"
import { SyncMembersButton } from "@/modules/telegram/components/sync-members-button"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface GroupMembersPageProps {
  params: Promise<{ id: string }>
}

export default async function GroupMembersPage({ params }: GroupMembersPageProps) {
  const { id } = await params
  const group = await getGroupById(id)

  if (!group) notFound()

  const [members, stats] = await Promise.all([
    getContacts({ groupId: id }),
    getGroupIndexStats(id),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Link href="/telegram/groups">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{group.title}</h1>
          <p className="text-xs text-muted-foreground">
            {stats.total.toLocaleString()} of {(group.memberCount ?? 0).toLocaleString()} members synced
            &nbsp;&middot;&nbsp;
            Last synced {new Date(group.syncedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncMembersButton
            groupId={id}
            totalMembers={group.memberCount ?? 0}
            syncedMembers={stats.total}
          />
          <BioIndexButton
            groupId={id}
            totalMembers={stats.total}
            initialIndexed={stats.indexed}
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-sm text-muted-foreground">No members synced yet.</p>
            <p className="text-xs text-muted-foreground">
              Click <strong>Sync Members</strong> above to import this group&apos;s members.
              For large groups this runs in batches — leave the tab open until complete.
            </p>
          </div>
        ) : (
          <ContactsTable data={members} />
        )}
      </div>
    </div>
  )
}
