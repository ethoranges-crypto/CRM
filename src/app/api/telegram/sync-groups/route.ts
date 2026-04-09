import { NextRequest, NextResponse } from "next/server"
import { getCanEdit } from "@/lib/auth"
import { syncAllGroups, syncGroupMembers } from "@/modules/telegram/sync"

export async function POST(request: NextRequest) {
  if (!(await getCanEdit())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    if (body.groupEntity) {
      await syncGroupMembers(body.groupEntity)
    } else {
      await syncAllGroups()
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
