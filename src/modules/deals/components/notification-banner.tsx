"use client"

import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { useReminderCountStore } from "../reminder-store"

export function NotificationBanner() {
  const permission = useReminderCountStore((s) => s.notificationPermission)
  const requestPermission = useReminderCountStore((s) => s.requestPermission)

  if (permission === "granted") return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      {permission === "denied" ? (
        <>
          <BellOff className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            Desktop notifications are blocked. Please enable them in your
            browser settings to receive reminder alerts.
          </p>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
            Enable desktop notifications to get alerted when reminders are due.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => requestPermission?.()}
          >
            Enable Notifications
          </Button>
        </>
      )}
    </div>
  )
}
