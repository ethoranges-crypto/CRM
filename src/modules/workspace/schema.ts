import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// "My Workspace" — a manual, personal command centre independent of deals
// and of the automatic Today dashboard. Three flat, freeform panels.

export const workspaceTasks = sqliteTable("workspace_tasks", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  // Set when isCompleted flips to true, cleared when unticked. Drives the
  // midnight-UTC cleanup in getWorkspaceTasks() — kept separate from
  // updatedAt so renaming a completed task doesn't reset its cleanup clock.
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const workspaceNotes = sqliteTable("workspace_notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const workspaceProjects = sqliteTable("workspace_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("not_started"), // not_started | in_progress | blocked | done
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const workspaceProjectNotes = sqliteTable("workspace_project_notes", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => workspaceProjects.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})
