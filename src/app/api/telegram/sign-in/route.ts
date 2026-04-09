import { NextRequest, NextResponse } from "next/server"
import { getTelegramClient } from "@/modules/telegram/client"
import { getCanEdit } from "@/lib/auth"
import { Api } from "telegram/tl"

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { phone, code, phoneCodeHash, password } = await request.json()
    const client = getTelegramClient()
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

    const session = client.session.save() as unknown as string
    return NextResponse.json({ session })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
