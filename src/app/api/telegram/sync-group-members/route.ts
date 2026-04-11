import { NextRequest, NextResponse } from "next/server"
import { getCanEdit } from "@/lib/auth"
import { db } from "@/lib/db"
import { tgContacts, tgContactGroups, tgGroups } from "@/modules/telegram/schema"
import { getTelegramClient } from "@/modules/telegram/client"
import { Api } from "telegram"
import { eq } from "drizzle-orm"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { groupId, offset = 0, limit = 200 } = await request.json()
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

    const [group] = await db.select().from(tgGroups).where(eq(tgGroups.id, groupId))
    if (!group) return NextResponse.json({ error: "Group not found — re-run Sync All Groups first" }, { status: 404 })

    if (!group.accessHash || group.accessHash === "0") {
      return NextResponse.json({ error: "No access hash stored for this group. Run Sync All Groups first." }, { status: 400 })
    }

    const client = getTelegramClient()
    await client.connect()

    let users: Api.User[] = []
    let total = group.memberCount ?? 0

    if (group.isChannel) {
      // Supergroup / channel — paginated via channels.GetParticipants
      // ChannelParticipantsRecent returns recently-active members in order.
      // ChannelParticipantsSearch with q="" is a NAME search returning 0 results — do NOT use it.
      const result = await client.invoke(
        new Api.channels.GetParticipants({
          channel: new Api.InputChannel({
            channelId: BigInt(groupId) as unknown as Api.long,
            accessHash: BigInt(group.accessHash) as unknown as Api.long,
          }),
          filter: new Api.ChannelParticipantsRecent({}),
          offset,
          limit,
          hash: BigInt(0) as unknown as Api.long,
        })
      ) as Api.channels.ChannelParticipants

      total = result.count
      users = result.users.filter((u): u is Api.User => u instanceof Api.User)
    } else {
      // Regular group chat — one-shot, max ~200 members
      const result = await client.invoke(
        new Api.messages.GetFullChat({ chatId: BigInt(groupId) as unknown as Api.long })
      )
      const allUsers = result.users.filter((u): u is Api.User => u instanceof Api.User)
      users = allUsers.slice(offset, offset + limit)
      total = allUsers.length
    }

    // Upsert contacts and group links in parallel (10 at a time)
    const CONCURRENCY = 10
    for (let i = 0; i < users.length; i += CONCURRENCY) {
      await Promise.all(
        users.slice(i, i + CONCURRENCY).map(async (user) => {
          const accessHash = user.accessHash?.toString() ?? "0"
          await db
            .insert(tgContacts)
            .values({
              id: user.id.toString(),
              firstName: user.firstName || null,
              lastName: user.lastName || null,
              username: user.username || null,
              phone: user.phone || null,
              accessHash,
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
                accessHash,
                lastOnline:
                  user.status instanceof Api.UserStatusOffline
                    ? new Date(user.status.wasOnline * 1000)
                    : null,
                syncedAt: new Date(),
                // bio and company intentionally NOT updated — preserve indexed values
              },
            })
          await db
            .insert(tgContactGroups)
            .values({ contactId: user.id.toString(), groupId })
            .onConflictDoNothing()
        })
      )
    }

    if (total > 0) {
      await db.update(tgGroups).set({ memberCount: total }).where(eq(tgGroups.id, groupId))
    }

    const nextOffset = offset + users.length
    // Done when Telegram returns fewer than requested (end of list)
    const done = users.length < limit || nextOffset >= total

    return NextResponse.json({ synced: users.length, total, nextOffset, done })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
