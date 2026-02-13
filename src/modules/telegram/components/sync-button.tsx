"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { syncContacts } from "../sync"

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)

  async function handleSyncContacts() {
    setSyncing(true)
    try {
      await syncContacts()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Button
      onClick={handleSyncContacts}
      disabled={syncing}
      size="sm"
      variant="outline"
    >
      <RefreshCw className={`mr-1 h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync Contacts"}
    </Button>
  )
}
