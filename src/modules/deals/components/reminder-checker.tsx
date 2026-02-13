"use client"

import { useReminderNotifications } from "../hooks/use-reminder-notifications"

export function ReminderChecker() {
  useReminderNotifications()
  return null
}
