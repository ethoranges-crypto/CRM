import { redirect } from "next/navigation"
import { getCanEdit } from "@/lib/auth"
import { seed } from "@/lib/seed"
import {
  getWorkspaceTasks,
  getWorkspaceNotes,
  getWorkspaceProjects,
} from "@/modules/workspace/actions"
import { WorkspaceTodoPanel } from "@/modules/workspace/components/workspace-todo-panel"
import { WorkspaceNotesPanel } from "@/modules/workspace/components/workspace-notes-panel"
import { WorkspaceProjectsPanel } from "@/modules/workspace/components/workspace-projects-panel"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  await seed()

  const canEdit = await getCanEdit()
  if (!canEdit) redirect("/deals")

  const [tasks, notes, projects] = await Promise.all([
    getWorkspaceTasks(),
    getWorkspaceNotes(),
    getWorkspaceProjects(),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">My Workspace</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your personal space — jot, park, and track things that aren&rsquo;t tied to a deal.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          <WorkspaceTodoPanel initialTasks={tasks} />
          <WorkspaceNotesPanel initialNotes={notes} />
          <WorkspaceProjectsPanel initialProjects={projects} />
        </div>
      </div>
    </div>
  )
}
