import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const editParam = url.searchParams.get("edit")
  const editToken = process.env.EDIT_TOKEN

  // If a valid edit token is passed in the URL, set a persistent cookie and redirect
  if (editParam && editToken && editParam === editToken) {
    url.searchParams.delete("edit")
    const response = NextResponse.redirect(url)
    response.cookies.set("crm_edit", editToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
