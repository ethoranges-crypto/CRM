"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

export function ReadOnlyBanner() {
  const pathname = usePathname()
  const [token, setToken] = useState("")

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = token.trim()
    if (!trimmed) return
    // Full navigation (not router.push) so the proxy middleware sees the
    // request, validates the token, and sets the edit cookie before redirect.
    window.location.href = `${pathname}?edit=${encodeURIComponent(trimmed)}`
  }

  return (
    <form
      onSubmit={handleUnlock}
      className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30"
    >
      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-500" />
      <span className="text-amber-800 dark:text-amber-400">
        Viewing in read-only mode — adding, editing, and deleting is hidden until you unlock this device.
      </span>
      <Input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Edit token"
        className="h-7 w-40 border-amber-300 bg-white text-xs dark:bg-background"
      />
      <Button type="submit" size="sm" className="h-7 text-xs" disabled={!token.trim()}>
        Unlock
      </Button>
    </form>
  )
}
