import { getContacts, getGroupById } from "@/modules/telegram/actions"
import { ContactsTable } from "@/modules/telegram/components/contacts-table"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

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

  const members = await getContacts({ groupId: id })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Link href="/telegram/groups">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{group.title}</h1>
          <p className="text-xs text-muted-foreground">
            {group.memberCount ?? 0} members &middot; Last synced{" "}
            {new Date(group.syncedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ContactsTable data={members} />
      </div>
    </div>
  )
}
