import { NextResponse } from "next/server"
import { getTelegramClient } from "@/modules/telegram/client"

export async function GET() {
  const apiId = process.env.TG_API_ID
  const apiHash = process.env.TG_API_HASH
  if (!apiId || !apiHash || apiId === "0") {
    return NextResponse.json({ authed: false })
  }
  try {
    const client = getTelegramClient()
    await client.connect()
    const authed = await client.isUserAuthorized()
    return NextResponse.json({ authed })
  } catch {
    return NextResponse.json({ authed: false })
  }
}
