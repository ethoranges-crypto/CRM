import { NextRequest, NextResponse } from "next/server"
import { TelegramClient, sessions } from "telegram"
import { getCanEdit } from "@/lib/auth"

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { phone } = await request.json()

    const client = new TelegramClient(
      new sessions.StringSession(""),
      parseInt(process.env.TG_API_ID!),
      process.env.TG_API_HASH!,
      { connectionRetries: 3 }
    )
    await client.connect()

    const result = await client.sendCode(
      {
        apiId: parseInt(process.env.TG_API_ID!),
        apiHash: process.env.TG_API_HASH!,
      },
      phone
    )

    // Save session state server-side in a cookie — never expose it to the client
    const sessionString = client.session.save() as unknown as string

    const response = NextResponse.json({ phoneCodeHash: result.phoneCodeHash })
    response.cookies.set("tg_pending_session", sessionString, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    })
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
