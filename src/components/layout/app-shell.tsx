import { getCanEdit } from "@/lib/auth"
import { Sidebar } from "./sidebar"
import { ReadOnlyBanner } from "./read-only-banner"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const canEdit = await getCanEdit()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {!canEdit && <ReadOnlyBanner />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar canEdit={canEdit} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
