"use client"

import { useEffect, useRef, useCallback } from "react"
import { getDueReminders } from "../actions"
import { useReminderCountStore } from "../reminder-store"

export function useReminderNotifications() {
  const setDueCount = useReminderCountStore((s) => s.setDueCount)
  const setNotificationPermission = useReminderCountStore(
    (s) => s.setNotificationPermission
  )
  const setRequestPermission = useReminderCountStore(
    (s) => s.setRequestPermission
  )
  const notifiedIds = useRef(new Set<string>())

  // Sync permission state on mount
  // In Electron, notifications are always available — mark as granted
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.electronAPI?.isElectron) {
      setNotificationPermission("granted")
    } else if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [setNotificationPermission])

  // Expose the permission request function (must be called from user gesture)
  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
  }, [setNotificationPermission])

  useEffect(() => {
    setRequestPermission(requestPermission)
  }, [requestPermission, setRequestPermission])

  const fireNotification = useCallback(
    (title: string, body: string, tag: string) => {
      if (typeof window === "undefined") return

      // Use Electron native notifications when available (works even when minimised)
      if (window.electronAPI?.isElectron) {
        window.electronAPI.sendNotification({ title, body })
        return
      }

      // Browser fallback
      if (!("Notification" in window)) return
      if (Notification.permission !== "granted") return

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, {
              body,
              tag,
              icon: "/favicon.ico",
              requireInteraction: true,
            })
          })
          .catch(() => {
            new Notification(title, { body, tag, icon: "/favicon.ico" })
          })
      } else {
        new Notification(title, { body, tag, icon: "/favicon.ico" })
      }
    },
    []
  )

  const checkReminders = useCallback(async () => {
    try {
      const dueReminders = await getDueReminders()
      setDueCount(dueReminders.length)

      for (const reminder of dueReminders) {
        if (!notifiedIds.current.has(reminder.id)) {
          notifiedIds.current.add(reminder.id)
          fireNotification(
            "CRM Reminder",
            reminder.note,
            `reminder-${reminder.id}`
          )
        }
      }
    } catch {
      // Silently fail polling
    }
  }, [setDueCount, fireNotification])

  useEffect(() => {
    checkReminders()
    const interval = setInterval(checkReminders, 30_000)
    return () => clearInterval(interval)
  }, [checkReminders])
}
