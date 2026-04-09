"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw } from "lucide-react"

export function SyncGroupButton() {
  const [syncing, setSyncing] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [groupInput, setGroupInput] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSyncGroup() {
    if (!groupInput.trim()) return
    setSyncing(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/sync-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupEntity: groupInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      setGroupInput("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    setError("")
    try {
      const res = await fetch("/api/telegram/sync-groups", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncingAll(false)
    }
  }

  const isDisabled = syncing || syncingAll

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button onClick={handleSyncAll} disabled={isDisabled} size="sm" variant="outline">
          <RefreshCw className={`mr-1 h-3 w-3 ${syncingAll ? "animate-spin" : ""}`} />
          {syncingAll ? "Syncing All..." : "Sync All Groups"}
        </Button>
        <Input
          value={groupInput}
          onChange={(e) => setGroupInput(e.target.value)}
          placeholder="Group username or ID"
          className="w-56"
          onKeyDown={(e) => { if (e.key === "Enter") handleSyncGroup() }}
        />
        <Button onClick={handleSyncGroup} disabled={isDisabled || !groupInput.trim()} size="sm" variant="outline">
          <RefreshCw className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Group"}
        </Button>
      </div>
    </div>
  )
}
