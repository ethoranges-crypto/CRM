"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { getTelegramClient } from "./client"
import { Api } from "telegram/tl"
import { like, or, eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { TgContact } from "./types"

// --- Auth actions ---

export async function checkTelegramAuth(): Promise<boolean> {
  const apiId = process.env.TG_API_ID
  const apiHash = process.env.TG_API_HASH
  if (!apiId || !apiHash || apiId === "0") return false

  try {
    const client = getTelegramClient()
    await client.connect()
    return await client.isUserAuthorized()
  } catch {
    return false
  }
}

export async function sendTelegramCode(
  phone: string
): Promise<{ phoneCodeHash: string }> {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()
  const result = await client.sendCode(
    {
      apiId: parseInt(process.env.TG_API_ID!),
      apiHash: process.env.TG_API_HASH!,
    },
    phone
  )
  return { phoneCodeHash: result.phoneCodeHash }
}

export async function signInTelegram(
  phone: string,
  code: string,
  phoneCodeHash: string,
  password?: string
): Promise<{ session: string }> {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    )
  } catch (err: unknown) {
    const error = err as { errorMessage?: string }
    if (error.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
      await client.signInWithPassword(
        {
          apiId: parseInt(process.env.TG_API_ID!),
          apiHash: process.env.TG_API_HASH!,
        },
        {
          password: async () => password,
          onError: (err: Error) => {
            throw err
          },
        }
      )
    } else {
      throw err
    }
  }

  const sessionString = client.session.save() as unknown as string
  return { session: sessionString }
}

// --- Data actions ---

export async function getContacts(filters?: {
  search?: string
  groupId?: string
}): Promise<TgContact[]> {
  let contacts: TgContact[]

  if (filters?.search) {
    const term = `%${filters.search}%`
    contacts = await db
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
  } else {
    contacts = await db.select().from(tgContacts)
  }

  if (filters?.groupId) {
    const groupContactRows = await db
      .select({ contactId: tgContactGroups.contactId })
      .from(tgContactGroups)
      .where(eq(tgContactGroups.groupId, filters.groupId))

    const groupContactIds = groupContactRows.map((r) => r.contactId)
    return contacts.filter((c) => groupContactIds.includes(c.id))
  }

  return contacts
}

export async function getGroups() {
  return db.select().from(tgGroups)
}

export async function getGroupById(id: string) {
  const rows = await db.select().from(tgGroups).where(eq(tgGroups.id, id))
  return rows[0] ?? null
}

export async function updateContactCompany(
  contactId: string,
  company: string
) {
  if (!(await getCanEdit())) return { success: false as const, error: "Unauthorized" }
  try {
    await db
      .update(tgContacts)
      .set({ company })
      .where(eq(tgContacts.id, contactId))
    return { success: true as const }
  } catch (err) {
    console.error("updateContactCompany error:", err)
    return { success: false as const, error: String(err) }
  }
}

export async function deleteGroup(groupId: string) {
  if (!(await getCanEdit())) return
  await db
    .delete(tgContactGroups)
    .where(eq(tgContactGroups.groupId, groupId))
  await db.delete(tgGroups).where(eq(tgGroups.id, groupId))
  revalidatePath("/telegram/groups")
}
