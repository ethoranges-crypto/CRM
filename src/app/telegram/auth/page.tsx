import { AuthForm } from "@/modules/telegram/components/auth-form"
import { getCanEdit } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function TelegramAuthPage() {
  const canEdit = await getCanEdit()
  const isAuthed = !!(process.env.TG_SESSION && process.env.TG_SESSION.length > 10)

  if (isAuthed) redirect("/telegram")
  if (!canEdit) redirect("/telegram")

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Connect Telegram</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your phone number to authenticate with Telegram. You need your
            API ID and Hash from my.telegram.org set in environment variables first.
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
