import type { InferSelectModel } from "drizzle-orm"
import type { workspaceTasks, workspaceNotes, workspaceProjects } from "./schema"

export type WorkspaceTask = InferSelectModel<typeof workspaceTasks>
export type WorkspaceNote = InferSelectModel<typeof workspaceNotes>
export type WorkspaceProject = InferSelectModel<typeof workspaceProjects>
