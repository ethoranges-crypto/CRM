"use client"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { DatabaseZap } from "lucide-react"

interface BioIndexButtonProps {
  groupId: string
  totalMembers: number
  initialIndexed: number
}

export function BioIndexButton({ groupId, totalMembers, initialIndexed }: BioIndexButtonProps) {
  const [indexed, setIndexed] = useState(initialIndexed)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(initialIndexed >= totalMembers && totalMembers > 0)
  const stopRef = useRef(false)

  const pct = totalMembers > 0 ? Math.round((indexed / totalMembers) * 100) : 0

  async function handleStart() {
    setRunning(true)
    setError("")
    stopRef.current = false

    while (!stopRef.current) {
      try {
        const res = await fetch("/api/telegram/index-bios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, batchSize: 100 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed")
        setIndexed(data.indexedMembers)
        if (data.done) { setDone(true); break }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Index failed")
        break
      }
    }
    setRunning(false)
  }

  function handleStop() { stopRef.current = true }

  if (totalMembers === 0) return null

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <DatabaseZap className="h-3 w-3" />
          {indexed.toLocaleString()} / {totalMembers.toLocaleString()} bios indexed
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {done ? (
        <p className="text-xs text-green-600">All bios indexed ✓</p>
      ) : running ? (
        <Button size="sm" variant="outline" onClick={handleStop} className="h-7 text-xs">
          Stop
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={handleStart} className="h-7 gap-1 text-xs">
          <DatabaseZap className="h-3 w-3" />
          {indexed > 0 ? "Resume Indexing" : "Index Bios"}
        </Button>
      )}
    </div>
  )
}
