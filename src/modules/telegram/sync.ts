"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { getTelegramClient } from "./client"
import { Api } from "telegram"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { parseCompanyFromBio } from "./bio-parser"

async function fetchUserBio(
  client: ReturnType<typeof getTelegramClient>,
  user: Api.User
): Promise<string | null> {
  try {
    const fullUser = await client.invoke(
      new Api.users.GetFullUser({
        id: new Api.InputUser({
          userId: user.id,
          accessHash: user.accessHash ?? (BigInt(0) as unknown as Api.long),
        }),
      })
    )
    return fullUser.fullUser?.about || null
  } catch {
    return null
  }
}

export async function syncContacts() {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()

  const result = await client.invoke(
    new Api.contacts.GetContacts({ hash: BigInt(0) as unknown as Api.long })
  )

  if (result instanceof Api.contacts.Contacts) {
    const users = result.users.filter((u): u is Api.User => u instanceof Api.User)

    // Bulk insert/update using only data already in the GetContacts response —
    // no per-user bio API calls so this scales to hundreds of contacts easily.
    for (const user of users) {
      const existingRows = await db
        .select({ bio: tgContacts.bio, company: tgContacts.company })
        .from(tgContacts)
        .where(eq(tgContacts.id, user.id.toString()))

      // Preserve any bio/company already stored; don't overwrite with null
      const existingBio = existingRows[0]?.bio ?? null
      const existingCompany = existingRows[0]?.company ?? null

      await db
        .insert(tgContacts)
        .values({
          id: user.id.toString(),
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          username: user.username || null,
          phone: user.phone || null,
          bio: existingBio,
          company: existingCompany,
          isContact: true,
          lastOnline:
            user.status instanceof Api.UserStatusOffline
              ? new Date(user.status.wasOnline * 1000)
              : null,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: tgContacts.id,
          set: {
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            username: user.username || null,
            phone: user.phone || null,
            isContact: true,
            lastOnline:
              user.status instanceof Api.UserStatusOffline
                ? new Date(user.status.wasOnline * 1000)
                : null,
            syncedAt: new Date(),
            // bio and company are NOT overwritten — preserve manual edits
          },
        })
    }
  }

  revalidatePath("/telegram")
}

export async function syncGroupMembers(groupEntity: string) {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()

  const entity = await client.getEntity(groupEntity)
  const groupId = entity.id.toString()
  const title =
    "title" in entity ? (entity as { title: string }).title : groupEntity

  await db
    .insert(tgGroups)
    .values({ id: groupId, title, syncedAt: new Date() })
    .onConflictDoUpdate({
      target: tgGroups.id,
      set: { title, syncedAt: new Date() },
    })

  try {
    const participants = await client.getParticipants(groupEntity, {
      limit: 500,
    })

    for (const user of participants) {
      if (user instanceof Api.User) {
        const bio = await fetchUserBio(client, user)
        const parsedCompany = parseCompanyFromBio(bio)

        const existingRows = await db
          .select({ company: tgContacts.company })
          .from(tgContacts)
          .where(eq(tgContacts.id, user.id.toString()))

        const company = existingRows[0]?.company || parsedCompany || null

        await db
          .insert(tgContacts)
          .values({
            id: user.id.toString(),
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            username: user.username || null,
            phone: user.phone || null,
            bio,
            company,
            lastOnline:
              user.status instanceof Api.UserStatusOffline
                ? new Date(user.status.wasOnline * 1000)
                : null,
            syncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: tgContacts.id,
            set: {
              firstName: user.firstName || null,
              lastName: user.lastName || null,
              username: user.username || null,
              bio,
              company,
              lastOnline:
                user.status instanceof Api.UserStatusOffline
                  ? new Date(user.status.wasOnline * 1000)
                  : null,
              syncedAt: new Date(),
            },
          })

        const existingLinks = await db
          .select()
          .from(tgContactGroups)
          .where(
            eq(tgContactGroups.contactId, user.id.toString())
          )

        if (!existingLinks.find((r) => r.groupId === groupId)) {
          await db
            .insert(tgContactGroups)
            .values({ contactId: user.id.toString(), groupId })
            .onConflictDoNothing()
        }
      }
    }

    await db
      .update(tgGroups)
      .set({ memberCount: participants.length })
      .where(eq(tgGroups.id, groupId))
  } catch (err: unknown) {
    const error = err as { errorMessage?: string; message?: string }
    const errMsg = error.errorMessage || error.message || ""
    if (
      errMsg.includes("CHAT_ADMIN_REQUIRED") ||
      errMsg.includes("CHANNEL_PRIVATE") ||
      errMsg.includes("CHANNEL_INVALID") ||
      errMsg.includes("CHAT_WRITE_FORBIDDEN") ||
      errMsg.includes("USER_NOT_PARTICIPANT")
    ) {
      console.warn(`Skipping member sync for "${title}" (${groupId}): ${errMsg}`)
    } else {
      throw err
    }
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}

export async function syncAllGroups() {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()

  const dialogs = await client.getDialogs({})

  // Save group metadata only — member syncing is per-group on demand.
  // Auto-syncing members for hundreds of groups would take many minutes.
  for (const dialog of dialogs) {
    const entity = dialog.entity
    if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
      const groupId = entity.id.toString()
      const title = entity.title || "Untitled"
      const memberCount =
        "participantsCount" in entity
          ? (entity.participantsCount ?? null)
          : null

      await db
        .insert(tgGroups)
        .values({ id: groupId, title, memberCount, syncedAt: new Date() })
        .onConflictDoUpdate({
          target: tgGroups.id,
          set: { title, memberCount, syncedAt: new Date() },
        })
    }
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}
