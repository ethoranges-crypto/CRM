"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { like, or, eq, and, count, isNotNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { TgContact } from "./types"

export async function getContacts(filters?: {
  search?: string
  groupId?: string
}): Promise<TgContact[]> {
  if (filters?.groupId) {
    // Query directly with a join — avoids loading all contacts into memory
    const term = filters.search ? `%${filters.search}%` : null
    const rows = await db
      .select({
        id: tgContacts.id,
        firstName: tgContacts.firstName,
        lastName: tgContacts.lastName,
        username: tgContacts.username,
        phone: tgContacts.phone,
        company: tgContacts.company,
        bio: tgContacts.bio,
        accessHash: tgContacts.accessHash,
        lastOnline: tgContacts.lastOnline,
        isContact: tgContacts.isContact,
        syncedAt: tgContacts.syncedAt,
      })
      .from(tgContacts)
      .innerJoin(tgContactGroups, eq(tgContacts.id, tgContactGroups.contactId))
      .where(
        term
          ? and(
              eq(tgContactGroups.groupId, filters.groupId),
              or(
                like(tgContacts.firstName, term),
                like(tgContacts.lastName, term),
                like(tgContacts.username, term),
                like(tgContacts.company, term)
              )
            )
          : eq(tgContactGroups.groupId, filters.groupId)
      )
    return rows as TgContact[]
  }

  if (filters?.search) {
    const term = `%${filters.search}%`
    return db
      .select()
      .from(tgContacts)
      .where(
        or(
          like(tgContacts.firstName, term),
          like(tgContacts.lastName, term),
          like(tgContacts.username, term),
          like(tgContacts.company, term)
        )
      )
  }

  return db.select().from(tgContacts)
}

export async function getGroups() {
  return db.select().from(tgGroups)
}

export async function getGroupById(id: string) {
  const [row] = await db.select().from(tgGroups).where(eq(tgGroups.id, id))
  return row ?? null
}

export async function getGroupIndexStats(groupId: string): Promise<{ total: number; indexed: number }> {
  const [[totalRow], [indexedRow]] = await Promise.all([
    db.select({ c: count() }).from(tgContactGroups).where(eq(tgContactGroups.groupId, groupId)),
    db
      .select({ c: count() })
      .from(tgContacts)
      .innerJoin(tgContactGroups, eq(tgContacts.id, tgContactGroups.contactId))
      .where(and(eq(tgContactGroups.groupId, groupId), isNotNull(tgContacts.bio))),
  ])
  return { total: totalRow?.c ?? 0, indexed: indexedRow?.c ?? 0 }
}

export async function updateContactCompany(contactId: string, company: string) {
  if (!(await getCanEdit())) return { success: false as const, error: "Unauthorized" }
  try {
    await db.update(tgContacts).set({ company }).where(eq(tgContacts.id, contactId))
    return { success: true as const }
  } catch (err) {
    return { success: false as const, error: String(err) }
  }
}

export async function deleteGroup(groupId: string) {
  if (!(await getCanEdit())) return
  await db.delete(tgContactGroups).where(eq(tgContactGroups.groupId, groupId))
  await db.delete(tgGroups).where(eq(tgGroups.id, groupId))
  revalidatePath("/telegram/groups")
}
