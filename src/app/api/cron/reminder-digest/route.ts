import { NextRequest, NextResponse } from "next/server"
import { getTelegramClient } from "@/modules/telegram/client"
import { getDigestData, formatDigestMessage, chunkDigestMessage } from "@/lib/digest"

// Extend Vercel function timeout (Telegram connect + send can be slow)
export const maxDuration = 30

// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
// "Authorization: Bearer <CRON_SECRET>" on scheduled invocations when the
// CRON_SECRET env var is set on the project — we require it here so this
// route can't be used by anyone else to spam your Telegram account.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await getDigestData()
    const chunks = chunkDigestMessage(formatDigestMessage(data))

    const client = getTelegramClient()
    await client.connect()
    try {
      for (const chunk of chunks) {
        await client.sendMessage("me", { message: chunk })
      }
    } finally {
      await client.disconnect()
    }

    return NextResponse.json({
      success: true,
      messagesSent: chunks.length,
      overdue: data.overdue.length,
      dueToday: data.dueToday.length,
      dueSoonDeals: data.dueSoonDeals.length,
      resurfacedDeals: data.resurfacedDeals.length,
      coldDeals: data.coldDeals.length,
      staleActionDeals: data.staleActionDeals.length,
      urgentTodos: data.urgentTodos.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("reminder-digest cron error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
