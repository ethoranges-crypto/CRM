import { getCanEdit } from "@/lib/auth"
import { Sidebar } from "./sidebar"

export async function AppShell({ children }: { children: React.ReactNode }) {
  const canEdit = await getCanEdit()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar canEdit={canEdit} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
