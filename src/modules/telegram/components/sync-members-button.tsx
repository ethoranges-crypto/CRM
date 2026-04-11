"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

interface SyncMembersButtonProps {
  groupId: string
  totalMembers: number
  syncedMembers: number
}

export function SyncMembersButton({ groupId, totalMembers, syncedMembers }: SyncMembersButtonProps) {
  const [synced, setSynced] = useState(syncedMembers)
  const [total, setTotal] = useState(totalMembers)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const stopRef = useRef(false)
  const router = useRouter()

  const pct = total > 0 ? Math.round((synced / total) * 100) : 0

  async function handleStart() {
    setRunning(true)
    setError("")
    setDone(false)
    stopRef.current = false
    let offset = 0 // always start from the beginning; onConflictDoNothing prevents duplicates

    while (!stopRef.current) {
      try {
        const res = await fetch("/api/telegram/sync-group-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, offset, limit: 200 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Sync failed")

        offset = data.nextOffset
        setSynced(offset)
        setTotal(data.total)

        if (data.done) {
          setDone(true)
          router.refresh()
          break
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Sync failed")
        break
      }
    }
    if (stopRef.current) router.refresh()
    setRunning(false)
  }

  function handleStop() {
    stopRef.current = true
  }

  return (
    <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
      {running && total > 0 && (
        <>
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>{synced.toLocaleString()} / {total.toLocaleString()} synced</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {done ? (
        <p className="text-xs text-green-600">Members synced ✓</p>
      ) : running ? (
        <Button size="sm" variant="outline" onClick={handleStop} className="h-7 text-xs">
          Stop
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleStart} className="h-7 gap-1 text-xs">
          <Users className="h-3 w-3" />
          {syncedMembers > 0 ? "Re-sync Members" : "Sync Members"}
        </Button>
      )}
    </div>
  )
}
