import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { tgContacts, tgGroups, tgContactGroups } from "./schema"
import { getTelegramClient } from "./client"
import { Api } from "telegram"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

const CONCURRENCY = 10

export async function syncContacts() {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()

  const result = await client.invoke(
    new Api.contacts.GetContacts({ hash: BigInt(0) as unknown as Api.long })
  )

  if (!(result instanceof Api.contacts.Contacts)) return

  const users = result.users.filter((u): u is Api.User => u instanceof Api.User)

  // Upsert in parallel. New contacts get bio=null (indexed later).
  // onConflictDoUpdate intentionally omits bio/company — preserves any existing values.
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    await Promise.all(
      users.slice(i, i + CONCURRENCY).map((user) =>
        db
          .insert(tgContacts)
          .values({
            id: user.id.toString(),
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            username: user.username || null,
            phone: user.phone || null,
            accessHash: user.accessHash?.toString() ?? "0",
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
              accessHash: user.accessHash?.toString() ?? "0",
              isContact: true,
              lastOnline:
                user.status instanceof Api.UserStatusOffline
                  ? new Date(user.status.wasOnline * 1000)
                  : null,
              syncedAt: new Date(),
            },
          })
      )
    )
  }

  revalidatePath("/telegram")
}

export async function syncGroupMembers(groupEntity: string) {
  if (!(await getCanEdit())) throw new Error("Unauthorized")
  const client = getTelegramClient()
  await client.connect()

  const entity = await client.getEntity(groupEntity)
  const groupId = entity.id.toString()
  const title = "title" in entity ? (entity as { title: string }).title : groupEntity
  const isChannel = entity instanceof Api.Channel
  const accessHash = isChannel ? (entity.accessHash?.toString() ?? "0") : "0"

  await db
    .insert(tgGroups)
    .values({ id: groupId, title, isChannel, accessHash, syncedAt: new Date() })
    .onConflictDoUpdate({
      target: tgGroups.id,
      set: { title, isChannel, accessHash, syncedAt: new Date() },
    })

  try {
    const participants = await client.getParticipants(groupEntity, { limit: 500 })

    for (let i = 0; i < participants.length; i += CONCURRENCY) {
      await Promise.all(
        participants.slice(i, i + CONCURRENCY).map(async (p) => {
          if (!(p instanceof Api.User)) return
          const hash = p.accessHash?.toString() ?? "0"
          await db
            .insert(tgContacts)
            .values({
              id: p.id.toString(),
              firstName: p.firstName || null,
              lastName: p.lastName || null,
              username: p.username || null,
              phone: p.phone || null,
              accessHash: hash,
              lastOnline:
                p.status instanceof Api.UserStatusOffline
                  ? new Date(p.status.wasOnline * 1000)
                  : null,
              syncedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: tgContacts.id,
              set: {
                firstName: p.firstName || null,
                lastName: p.lastName || null,
                username: p.username || null,
                accessHash: hash,
                lastOnline:
                  p.status instanceof Api.UserStatusOffline
                    ? new Date(p.status.wasOnline * 1000)
                    : null,
                syncedAt: new Date(),
              },
            })
          await db
            .insert(tgContactGroups)
            .values({ contactId: p.id.toString(), groupId })
            .onConflictDoNothing()
        })
      )
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

  const dialogs = await client.getDialogs({ limit: 500 })

  const groupRows = dialogs
    .filter((d) => d.entity instanceof Api.Chat || d.entity instanceof Api.Channel)
    .map((d) => {
      const entity = d.entity as Api.Chat | Api.Channel
      const isChannel = entity instanceof Api.Channel
      return {
        id: entity.id.toString(),
        title: entity.title || "Untitled",
        isChannel,
        accessHash: isChannel ? (entity.accessHash?.toString() ?? "0") : "0",
        memberCount:
          "participantsCount" in entity ? (entity.participantsCount ?? null) : null,
      }
    })

  for (let i = 0; i < groupRows.length; i += CONCURRENCY) {
    await Promise.all(
      groupRows.slice(i, i + CONCURRENCY).map((g) =>
        db
          .insert(tgGroups)
          .values({ ...g, syncedAt: new Date() })
          .onConflictDoUpdate({
            target: tgGroups.id,
            set: {
              title: g.title,
              memberCount: g.memberCount,
              accessHash: g.accessHash,
              isChannel: g.isChannel,
              syncedAt: new Date(),
            },
          })
      )
    )
  }

  revalidatePath("/telegram")
  revalidatePath("/telegram/groups")
}
