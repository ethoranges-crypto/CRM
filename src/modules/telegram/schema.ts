import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const tgContacts = sqliteTable("tg_contacts", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  phone: text("phone"),
  company: text("company"),
  bio: text("bio"),
  lastOnline: integer("last_online", { mode: "timestamp" }),
  isContact: integer("is_contact", { mode: "boolean" }).default(false),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const tgGroups = sqliteTable("tg_groups", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  memberCount: integer("member_count"),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const tgContactGroups = sqliteTable("tg_contact_groups", {
  contactId: text("contact_id")
    .notNull()
    .references(() => tgContacts.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => tgGroups.id, { onDelete: "cascade" }),
})
