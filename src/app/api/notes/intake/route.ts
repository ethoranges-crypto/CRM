import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deals, dealNotes, dealReminders } from "@/modules/deals/schema"
import { isNoteType } from "@/modules/deals/note-types"
import { or, like, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"

// Intake endpoint for AI notetaker call summaries (Otter, Fireflies, Fathom,
// Granola, or a Zapier/Make step forwarding a webhook). Since there is no
// logged-in user on this path, auth is a shared secret rather than the
// crm_edit cookie — set NOTES_WEBHOOK_SECRET and send it as a bearer token.
//
// Body:
//   dealId?: string          — attach directly to this deal, skipping matching
//   dealMatch?: string       — substring matched against company / alias /
//                              telegram handle (case-insensitive); required
//                              unless dealId is given
//   summary: string          — the call summary / note content
//   type?: "call"|"email"|"meeting"|"note" — defaults to "call"
//   followUpInDays?: number  — if set, also creates a reminder that many
//                              days out using the summary text

export async function POST(request: NextRequest) {
  const secret = process.env.NOTES_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "NOTES_WEBHOOK_SECRET not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    dealId?: string
    dealMatch?: string
    summary?: string
    type?: string
    followUpInDays?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const summary = body.summary?.trim()
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 })
  }

  const noteType = body.type && isNoteType(body.type) ? body.type : "call"

  let targetDealId: string
  try {
    if (body.dealId) {
      const found = await db.select({ id: deals.id }).from(deals).where(eq(deals.id, body.dealId))
      if (found.length === 0) {
        return NextResponse.json({ error: `No deal with id "${body.dealId}"` }, { status: 404 })
      }
      targetDealId = found[0].id
    } else {
      const dealMatch = body.dealMatch?.trim()
      if (!dealMatch) {
        return NextResponse.json({ error: "dealMatch or dealId is required" }, { status: 400 })
      }
      const term = `%${dealMatch}%`
      const matches = await db
        .select({ id: deals.id, alias: deals.alias, company: deals.company })
        .from(deals)
        .where(
          or(
            like(deals.company, term),
            like(deals.alias, term),
            like(deals.telegramHandle, term)
          )
        )

      if (matches.length === 0) {
        return NextResponse.json(
          { error: `No deal matched "${dealMatch}"` },
          { status: 404 }
        )
      }
      if (matches.length > 1) {
        return NextResponse.json(
          {
            error: `"${dealMatch}" matched multiple deals — refine dealMatch or pass dealId`,
            candidates: matches,
          },
          { status: 409 }
        )
      }
      targetDealId = matches[0].id
    }

    await db.insert(dealNotes).values({
      id: nanoid(),
      dealId: targetDealId,
      content: summary,
      type: noteType,
    })

    let reminderCreated = false
    if (typeof body.followUpInDays === "number" && body.followUpInDays > 0) {
      const dueAt = new Date()
      dueAt.setDate(dueAt.getDate() + body.followUpInDays)
      await db.insert(dealReminders).values({
        id: nanoid(),
        dealId: targetDealId,
        note: summary,
        dueAt,
        status: "active",
      })
      reminderCreated = true
    }

    revalidatePath("/deals")
    revalidatePath("/reminders")
    revalidatePath("/today")

    return NextResponse.json({ success: true, dealId: targetDealId, reminderCreated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("notes intake error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
