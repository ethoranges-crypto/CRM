import { redirect } from "next/navigation"
import { getCanEdit } from "@/lib/auth"
import { seed } from "@/lib/seed"
import {
  getWorkspaceTasks,
  getWorkspaceNotes,
  getWorkspaceProjects,
  getWorkspaceAchievements,
} from "@/modules/workspace/actions"
import { WorkspaceTodoPanel } from "@/modules/workspace/components/workspace-todo-panel"
import { WorkspaceNotesPanel } from "@/modules/workspace/components/workspace-notes-panel"
import { WorkspaceProjectsPanel } from "@/modules/workspace/components/workspace-projects-panel"
import { WorkspaceAchievementsPanel } from "@/modules/workspace/components/workspace-achievements-panel"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  await seed()

  const canEdit = await getCanEdit()
  if (!canEdit) redirect("/deals")

  const [tasks, notes, projects, achievements] = await Promise.all([
    getWorkspaceTasks(),
    getWorkspaceNotes(),
    getWorkspaceProjects(),
    getWorkspaceAchievements(),
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
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WorkspaceTodoPanel initialTasks={tasks} />
          <WorkspaceNotesPanel initialNotes={notes} />
          <WorkspaceProjectsPanel initialProjects={projects} />
          <WorkspaceAchievementsPanel initialAchievements={achievements} />
        </div>
      </div>
    </div>
  )
}
