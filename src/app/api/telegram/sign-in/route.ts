import { NextRequest, NextResponse } from "next/server"
import { TelegramClient, sessions, Api } from "telegram"
import { getCanEdit } from "@/lib/auth"

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { phone, code, phoneCodeHash, password } = await request.json()

    // Read the session that was set server-side by send-code — never trust the client for this
    const sessionString = request.cookies.get("tg_pending_session")?.value ?? ""

    const client = new TelegramClient(
      new sessions.StringSession(sessionString),
      parseInt(process.env.TG_API_ID!),
      process.env.TG_API_HASH!,
      { connectionRetries: 3 }
    )
    await client.connect()

    try {
      await client.invoke(
        new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code })
      )
    } catch (err: unknown) {
      const error = err as { errorMessage?: string }
      if (error.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
        await client.signInWithPassword(
          {
            apiId: parseInt(process.env.TG_API_ID!),
            apiHash: process.env.TG_API_HASH!,
          },
          {
            password: async () => password,
            onError: (e: Error) => { throw e },
          }
        )
      } else {
        throw err
      }
    }

    const finalSession = client.session.save() as unknown as string

    const response = NextResponse.json({ session: finalSession })
    // Clear the pending session cookie
    response.cookies.set("tg_pending_session", "", { maxAge: 0, path: "/" })
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
