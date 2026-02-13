"use server"

import { db } from "@/lib/db"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { getTelegramClient } from "./client"
import { Api } from "telegram/tl"
import { like, or, eq } from "drizzle-orm"
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
    contacts = db
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
      .all()
  } else {
    contacts = db.select().from(tgContacts).all()
  }

  if (filters?.groupId) {
    const groupContactIds = db
      .select({ contactId: tgContactGroups.contactId })
      .from(tgContactGroups)
      .where(eq(tgContactGroups.groupId, filters.groupId))
      .all()
      .map((r) => r.contactId)

    return contacts.filter((c) => groupContactIds.includes(c.id))
  }

  return contacts
}

export async function getGroups() {
  return db.select().from(tgGroups).all()
}

export async function getGroupById(id: string) {
  return db.select().from(tgGroups).where(eq(tgGroups.id, id)).get() ?? null
}

export async function updateContactCompany(
  contactId: string,
  company: string
) {
  db.update(tgContacts)
    .set({ company })
    .where(eq(tgContacts.id, contactId))
    .run()
}

export async function deleteGroup(groupId: string) {
  // Delete contact-group links first (cascade should handle this, but be explicit)
  db.delete(tgContactGroups)
    .where(eq(tgContactGroups.groupId, groupId))
    .run()
  // Delete the group itself
  db.delete(tgGroups)
    .where(eq(tgGroups.id, groupId))
    .run()

  revalidatePath("/telegram/groups")
}
