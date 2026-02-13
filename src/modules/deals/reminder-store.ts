"use client"

import { create } from "zustand"

interface ReminderCountStore {
  dueCount: number
  setDueCount: (count: number) => void
  notificationPermission: "default" | "granted" | "denied"
  setNotificationPermission: (p: "default" | "granted" | "denied") => void
  requestPermission: (() => Promise<void>) | null
  setRequestPermission: (fn: (() => Promise<void>) | null) => void
}

export const useReminderCountStore = create<ReminderCountStore>((set) => ({
  dueCount: 0,
  setDueCount: (count) => set({ dueCount: count }),
  notificationPermission: "default",
  setNotificationPermission: (p) => set({ notificationPermission: p }),
  requestPermission: null,
  setRequestPermission: (fn) => set({ requestPermission: fn }),
}))
