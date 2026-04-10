import { NextResponse } from "next/server"
import { getCanEdit } from "@/lib/auth"
import { syncContacts } from "@/modules/telegram/sync"

// Extend Vercel function timeout to 60 seconds (max on Hobby plan)
export const maxDuration = 60

export async function POST() {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    await syncContacts()
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
