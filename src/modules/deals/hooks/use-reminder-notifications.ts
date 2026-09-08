"use client"

import { useEffect, useRef, useCallback } from "react"
import { getDueNextSteps } from "../actions"
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

  useEffect(() => {
    if (typeof window === "undefined") return
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [setNotificationPermission])

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
      const dueSteps = await getDueNextSteps()
      setDueCount(dueSteps.length)

      for (const step of dueSteps) {
        // Keyed by deal + due date, not just deal id, so setting a new next
        // step on a deal that was already notified fires a fresh alert.
        const key = `${step.id}-${new Date(step.nextActionDate).getTime()}`
        if (!notifiedIds.current.has(key)) {
          notifiedIds.current.add(key)
          fireNotification(
            "CRM Next Step",
            step.note,
            `next-step-${key}`
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
