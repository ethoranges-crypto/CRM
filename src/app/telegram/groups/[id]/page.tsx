import { getContacts, getGroupById, getGroupIndexStats } from "@/modules/telegram/actions"
import { ContactsTable } from "@/modules/telegram/components/contacts-table"
import { BioIndexButton } from "@/modules/telegram/components/bio-index-button"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface GroupMembersPageProps {
  params: Promise<{ id: string }>
}

export default async function GroupMembersPage({
  params,
}: GroupMembersPageProps) {
  const { id } = await params
  const group = await getGroupById(id)

  if (!group) {
    notFound()
  }

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
            {group.memberCount ?? 0} members &middot; Last synced{" "}
            {new Date(group.syncedAt).toLocaleDateString()}
          </p>
        </div>
        <BioIndexButton
          groupId={id}
          totalMembers={group.memberCount ?? stats.total}
          initialIndexed={stats.indexed}
        />
      </div>
      <div className="flex-1 overflow-auto p-6">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No members synced yet. Use the Sync Group button on the Groups page to import members.</p>
          </div>
        ) : (
          <ContactsTable data={members} />
        )}
      </div>
    </div>
  )
}
