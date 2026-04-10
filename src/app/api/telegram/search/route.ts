import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tgContacts, tgContactGroups, tgGroups } from "@/modules/telegram/schema"
import { like, or, eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const groupId = request.nextUrl.searchParams.get("groupId") ?? ""

  if (q.length < 2) return NextResponse.json([])

  const term = `%${q}%`

  // Find matching contacts (bio, name, username)
  let contacts = await db.select().from(tgContacts).where(
    or(
      like(tgContacts.bio, term),
      like(tgContacts.firstName, term),
      like(tgContacts.lastName, term),
      like(tgContacts.username, term),
      like(tgContacts.company, term),
    )
  ).limit(200)

  if (groupId) {
    const members = await db
      .select({ contactId: tgContactGroups.contactId })
      .from(tgContactGroups)
      .where(eq(tgContactGroups.groupId, groupId))
    const ids = new Set(members.map(m => m.contactId))
    contacts = contacts.filter(c => ids.has(c.id))
  }

  if (contacts.length === 0) return NextResponse.json([])

  // Get group memberships for results
  const contactIds = contacts.map(c => c.id)
  const allMemberships = await db
    .select({ contactId: tgContactGroups.contactId, groupId: tgContactGroups.groupId, title: tgGroups.title })
    .from(tgContactGroups)
    .innerJoin(tgGroups, eq(tgContactGroups.groupId, tgGroups.id))

  const membershipMap = new Map<string, { id: string; title: string }[]>()
  for (const m of allMemberships) {
    if (contactIds.includes(m.contactId)) {
      if (!membershipMap.has(m.contactId)) membershipMap.set(m.contactId, [])
      membershipMap.get(m.contactId)!.push({ id: m.groupId, title: m.title })
    }
  }

  const results = contacts.map(c => ({
    ...c,
    groups: membershipMap.get(c.id) ?? [],
  }))

  return NextResponse.json(results)
}
