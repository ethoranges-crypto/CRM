"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw } from "lucide-react"
import { syncGroupMembers, syncAllGroups } from "../sync"

export function SyncGroupButton() {
  const [syncing, setSyncing] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [groupInput, setGroupInput] = useState("")

  async function handleSyncGroup() {
    if (!groupInput.trim()) return
    setSyncing(true)
    try {
      await syncGroupMembers(groupInput.trim())
      setGroupInput("")
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    try {
      await syncAllGroups()
    } finally {
      setSyncingAll(false)
    }
  }

  const isDisabled = syncing || syncingAll

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSyncAll}
        disabled={isDisabled}
        size="sm"
        variant="outline"
      >
        <RefreshCw
          className={`mr-1 h-3 w-3 ${syncingAll ? "animate-spin" : ""}`}
        />
        {syncingAll ? "Syncing All..." : "Sync All Groups"}
      </Button>
      <Input
        value={groupInput}
        onChange={(e) => setGroupInput(e.target.value)}
        placeholder="Group username or ID"
        className="w-56"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSyncGroup()
        }}
      />
      <Button
        onClick={handleSyncGroup}
        disabled={isDisabled || !groupInput.trim()}
        size="sm"
        variant="outline"
      >
        <RefreshCw
          className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`}
        />
        {syncing ? "Syncing..." : "Sync Group"}
      </Button>
    </div>
  )
}
