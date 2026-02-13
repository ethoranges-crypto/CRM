"use server"

import { db } from "@/lib/db"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { getTelegramClient } from "./client"
import { Api } from "telegram/tl"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { parseCompanyFromBio } from "./bio-parser"

/** Fetch bio string for a user via GetFullUser API. Returns null on failure. */
async function fetchUserBio(
  client: ReturnType<typeof getTelegramClient>,
  user: Api.User
): Promise<string | null> {
  try {
    const fullUser = await client.invoke(
      new Api.users.GetFullUser({ id: new Api.InputUser({ userId: user.id, accessHash: user.accessHash ?? (BigInt(0) as unknown as Api.long) }) })
    )
    return fullUser.fullUser?.about || null
  } catch {
    return null
  }
}

export async function syncContacts() {
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

        // Only set company from bio if there isn't already a manually set value
        const existing = db
          .select({ company: tgContacts.company })
          .from(tgContacts)
          .where(eq(tgContacts.id, user.id.toString()))
          .get()

        const company = existing?.company || parsedCompany || null

        db.insert(tgContacts)
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
          .run()
      }
    }
  }

  revalidatePath("/telegram")
}

export async function syncGroupMembers(groupEntity: string) {
  const client = getTelegramClient()
  await client.connect()

  const entity = await client.getEntity(groupEntity)
  const groupId = entity.id.toString()
  const title =
    "title" in entity ? (entity as { title: string }).title : groupEntity

  db.insert(tgGroups)
    .values({
      id: groupId,
      title,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: tgGroups.id,
      set: { title, syncedAt: new Date() },
    })
    .run()

  try {
    const participants = await client.getParticipants(groupEntity, { limit: 500 })

    for (const user of participants) {
      if (user instanceof Api.User) {
        const bio = await fetchUserBio(client, user)
        const parsedCompany = parseCompanyFromBio(bio)

        const existing = db
          .select({ company: tgContacts.company })
          .from(tgContacts)
          .where(eq(tgContacts.id, user.id.toString()))
          .get()

        const company = existing?.company || parsedCompany || null

        db.insert(tgContacts)
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
          .run()

        const existingLink = db
          .select()
          .from(tgContactGroups)
          .where(eq(tgContactGroups.contactId, user.id.toString()))
          .all()
          .find((r) => r.groupId === groupId)

        if (!existingLink) {
          db.insert(tgContactGroups)
            .values({ contactId: user.id.toString(), groupId })
            .run()
        }
      }
    }

    db.update(tgGroups)
      .set({ memberCount: participants.length })
      .where(eq(tgGroups.id, groupId))
      .run()
  } catch (err: unknown) {
    const error = err as { errorMessage?: string; message?: string }
    const errMsg = error.errorMessage || error.message || ""
    // Gracefully skip common permission / access errors
    if (
      errMsg.includes("CHAT_ADMIN_REQUIRED") ||
      errMsg.includes("CHANNEL_PRIVATE") ||
      errMsg.includes("CHANNEL_INVALID") ||
      errMsg.includes("CHAT_WRITE_FORBIDDEN") ||
      errMsg.includes("USER_NOT_PARTICIPANT")
    ) {
      console.warn(
        `Skipping member sync for "${title}" (${groupId}): ${errMsg}`
      )
    } else {
      throw err
    }
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}

export async function syncAllGroups() {
  const client = getTelegramClient()
  await client.connect()

  const dialogs = await client.getDialogs({})

  const groups: { id: string; title: string; entity: Api.Chat | Api.Channel }[] = []

  for (const dialog of dialogs) {
    const entity = dialog.entity
    if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
      const groupId = entity.id.toString()
      const title = entity.title || "Untitled"
      const memberCount =
        "participantsCount" in entity
          ? (entity.participantsCount ?? null)
          : null

      db.insert(tgGroups)
        .values({
          id: groupId,
          title,
          memberCount,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: tgGroups.id,
          set: { title, memberCount, syncedAt: new Date() },
        })
        .run()

      groups.push({ id: groupId, title, entity })
    }
  }

  // Now attempt member sync for each discovered group
  for (const group of groups) {
    try {
      const participants = await client.getParticipants(group.entity, { limit: 500 })

      for (const user of participants) {
        if (user instanceof Api.User) {
          const bio = await fetchUserBio(client, user)
          const parsedCompany = parseCompanyFromBio(bio)

          const existing = db
            .select({ company: tgContacts.company })
            .from(tgContacts)
            .where(eq(tgContacts.id, user.id.toString()))
            .get()

          const company = existing?.company || parsedCompany || null

          db.insert(tgContacts)
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
            .run()

          const existingLink = db
            .select()
            .from(tgContactGroups)
            .where(eq(tgContactGroups.contactId, user.id.toString()))
            .all()
            .find((r) => r.groupId === group.id)

          if (!existingLink) {
            db.insert(tgContactGroups)
              .values({ contactId: user.id.toString(), groupId: group.id })
              .run()
          }
        }
      }

      db.update(tgGroups)
        .set({ memberCount: participants.length })
        .where(eq(tgGroups.id, group.id))
        .run()
    } catch (err: unknown) {
      const error = err as { errorMessage?: string; message?: string }
      const errMsg = error.errorMessage || error.message || ""
      // Gracefully skip common permission / access errors
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
        // Log but continue with other groups instead of aborting
        console.error(
          `Error syncing members for "${group.title}" (${group.id}): ${errMsg}`
        )
      }
    }
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}
