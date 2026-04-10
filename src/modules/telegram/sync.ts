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
    for (const user of result.users) {
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
              bio,
              company,
              isContact: true,
              lastOnline:
                user.status instanceof Api.UserStatusOffline
                  ? new Date(user.status.wasOnline * 1000)
                  : null,
              syncedAt: new Date(),
            },
          })
      }
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

  const groups: {
    id: string
    title: string
    entity: Api.Chat | Api.Channel
  }[] = []

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

      groups.push({ id: groupId, title, entity })
    }
  }

  for (const group of groups) {
    try {
      const participants = await client.getParticipants(group.entity, {
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
            .where(eq(tgContactGroups.contactId, user.id.toString()))

          if (!existingLinks.find((r) => r.groupId === group.id)) {
            await db
              .insert(tgContactGroups)
              .values({ contactId: user.id.toString(), groupId: group.id })
              .onConflictDoNothing()
          }
        }
      }

      await db
        .update(tgGroups)
        .set({ memberCount: participants.length })
        .where(eq(tgGroups.id, group.id))
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
        console.warn(
          `Skipping member sync for "${group.title}" (${group.id}): ${errMsg}`
        )
      } else {
        console.error(
          `Error syncing members for "${group.title}" (${group.id}): ${errMsg}`
        )
      }
    }
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}
