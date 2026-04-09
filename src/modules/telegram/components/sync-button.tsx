"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSyncContacts() {
    setSyncing(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/sync-contacts", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button onClick={handleSyncContacts} disabled={syncing} size="sm" variant="outline">
        <RefreshCw className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Contacts"}
      </Button>
    </div>
  )
}
