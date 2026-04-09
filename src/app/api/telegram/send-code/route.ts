import { NextRequest, NextResponse } from "next/server"
import { getTelegramClient } from "@/modules/telegram/client"
import { getCanEdit } from "@/lib/auth"

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { phone } = await request.json()
    const client = getTelegramClient()
    await client.connect()
    const result = await client.sendCode(
      {
        apiId: parseInt(process.env.TG_API_ID!),
        apiHash: process.env.TG_API_HASH!,
      },
      phone
    )
    return NextResponse.json({ phoneCodeHash: result.phoneCodeHash })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
