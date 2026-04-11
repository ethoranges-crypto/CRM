import { NextRequest, NextResponse } from "next/server"
import { getCanEdit } from "@/lib/auth"
import { db } from "@/lib/db"
import { tgContacts, tgContactGroups } from "@/modules/telegram/schema"
import { getTelegramClient } from "@/modules/telegram/client"
import { Api } from "telegram"
import { eq, and, isNull, isNotNull, count } from "drizzle-orm"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { groupId, batchSize = 100 } = await request.json()
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 })

    // Count totals
    const [[totalRow], [indexedRow]] = await Promise.all([
      db.select({ c: count() }).from(tgContactGroups).where(eq(tgContactGroups.groupId, groupId)),
      db.select({ c: count() }).from(tgContacts)
        .innerJoin(tgContactGroups, eq(tgContacts.id, tgContactGroups.contactId))
        .where(and(eq(tgContactGroups.groupId, groupId), isNotNull(tgContacts.bio))),
    ])
    const totalMembers = totalRow?.c ?? 0
    const alreadyIndexed = indexedRow?.c ?? 0

    // Get next batch to index (bio IS NULL)
    const unindexed = await db
      .select({ id: tgContacts.id, accessHash: tgContacts.accessHash })
      .from(tgContacts)
      .innerJoin(tgContactGroups, eq(tgContacts.id, tgContactGroups.contactId))
      .where(and(eq(tgContactGroups.groupId, groupId), isNull(tgContacts.bio)))
      .limit(batchSize)

    if (unindexed.length === 0) {
      return NextResponse.json({ processed: 0, totalMembers, indexedMembers: alreadyIndexed, done: true })
    }

    const client = getTelegramClient()
    await client.connect()

    const CONCURRENCY = 20
    for (let i = 0; i < unindexed.length; i += CONCURRENCY) {
      const batch = unindexed.slice(i, i + CONCURRENCY)
      await Promise.all(batch.map(async ({ id, accessHash }) => {
        try {
          const fullUser = await client.invoke(
            new Api.users.GetFullUser({
              id: new Api.InputUser({
                userId: BigInt(id) as unknown as Api.long,
                accessHash: BigInt(accessHash ?? "0") as unknown as Api.long,
              }),
            })
          )
          const bio = fullUser.fullUser?.about ?? ""
          await db.update(tgContacts).set({ bio }).where(eq(tgContacts.id, id))
        } catch {
          await db.update(tgContacts).set({ bio: "" }).where(eq(tgContacts.id, id))
        }
      }))
    }

    const newIndexedCount = alreadyIndexed + unindexed.length
    return NextResponse.json({
      processed: unindexed.length,
      totalMembers,
      indexedMembers: newIndexedCount,
      done: newIndexedCount >= totalMembers,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
