import { cookies } from "next/headers"

export async function getCanEdit(): Promise<boolean> {
  const editToken = process.env.EDIT_TOKEN
  if (!editToken) return false

  const cookieStore = await cookies()
  const token = cookieStore.get("crm_edit")?.value
  return token === editToken
}
