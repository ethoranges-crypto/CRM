import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core"

export const pipelineColumns = sqliteTable("pipeline_columns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const deals = sqliteTable("deals", {
  id: text("id").primaryKey(),
  alias: text("alias").notNull(),
  company: text("company"),
  telegramHandle: text("telegram_handle"),
  columnId: text("column_id")
    .notNull()
    .references(() => pipelineColumns.id),
  order: integer("order").notNull(),
  actionTakenAt: integer("action_taken_at", { mode: "timestamp" }),
  actionNote: text("action_note"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const dealNotes = sqliteTable("deal_notes", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const dealCustomFields = sqliteTable("deal_custom_fields", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  fieldValue: text("field_value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const labels = sqliteTable("labels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const dealLabels = sqliteTable(
  "deal_labels",
  {
    dealId: text("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dealId, table.labelId] }),
  })
)

export const dealReminders = sqliteTable("deal_reminders", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("active"), // active | paused | done
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})
