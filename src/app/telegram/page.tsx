import { getContacts } from "@/modules/telegram/actions"
import { ContactsTable } from "@/modules/telegram/components/contacts-table"
import { SyncButton } from "@/modules/telegram/components/sync-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getCanEdit } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function TelegramPage() {
  const [canEdit] = await Promise.all([getCanEdit()])
  // Use session presence as a lightweight auth check — avoids connecting
  // to Telegram during server render which causes bundling issues
  const isAuthed = !!(process.env.TG_SESSION && process.env.TG_SESSION.length > 10)

  if (!isAuthed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Telegram Not Connected</h2>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "Connect your Telegram account to sync contacts and group members."
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

  const contacts = await getContacts()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Telegram Contacts</h1>
        {canEdit && <SyncButton />}
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ContactsTable data={contacts} />
      </div>
    </div>
  )
}
