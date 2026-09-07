import type { InferSelectModel } from "drizzle-orm"
import type { workspaceTasks, workspaceNotes, workspaceProjects, workspaceProjectNotes } from "./schema"

export type WorkspaceTask = InferSelectModel<typeof workspaceTasks>
export type WorkspaceNote = InferSelectModel<typeof workspaceNotes>
export type WorkspaceProject = InferSelectModel<typeof workspaceProjects>
export type WorkspaceProjectNote = InferSelectModel<typeof workspaceProjectNotes>

export type WorkspaceProjectWithNotes = WorkspaceProject & {
  notes: WorkspaceProjectNote[]
}
