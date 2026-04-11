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

    // Look up group in DB so we have the access hash
    const groupRows = await db.select().from(tgGroups).where(eq(tgGroups.id, groupId))
    const group = groupRows[0]
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    const client = getTelegramClient()
    await client.connect()

    let users: Api.User[] = []
    let total = group.memberCount ?? 0

    if (group.isChannel && group.accessHash && group.accessHash !== "0") {
      // Channel/supergroup — supports paginated GetParticipants
      const result = await client.invoke(
        new Api.channels.GetParticipants({
          channel: new Api.InputChannel({
            channelId: BigInt(groupId),
            accessHash: BigInt(group.accessHash),
          }),
          filter: new Api.ChannelParticipantsSearch({ q: "" }),
          offset,
          limit,
          hash: BigInt(0),
        })
      ) as Api.channels.ChannelParticipants
      total = result.count
      users = result.users.filter((u): u is Api.User => u instanceof Api.User)
    } else {
      // Regular chat — get all members in one shot (max ~200)
      const result = await client.invoke(
        new Api.messages.GetFullChat({ chatId: BigInt(groupId) })
      )
      const allUsers = result.users.filter((u): u is Api.User => u instanceof Api.User)
      users = allUsers.slice(offset, offset + limit)
      total = allUsers.length
    }

    // Upsert each user into tgContacts and link to this group
    for (const user of users) {
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
          },
        })

      await db
        .insert(tgContactGroups)
        .values({ contactId: user.id.toString(), groupId })
        .onConflictDoNothing()
    }

    // Update stored member count if we got a real total from Telegram
    if (total > 0) {
      await db.update(tgGroups).set({ memberCount: total }).where(eq(tgGroups.id, groupId))
    }

    const nextOffset = offset + users.length
    const done = users.length < limit || nextOffset >= total

    return NextResponse.json({ synced: users.length, total, nextOffset, done })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
