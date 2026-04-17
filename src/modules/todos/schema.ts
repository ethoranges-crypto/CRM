import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  isUrgent: integer("is_urgent", { mode: "boolean" }).notNull().default(false),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  // If set, task only appears from this date forwards (stored as midnight of that day)
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})
