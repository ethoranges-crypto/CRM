"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pause, Play, Check, Trash2, Clock } from "lucide-react"
import { updateReminder, deleteReminder, markReminderDone, addReminder } from "../actions"
import { formatDateTime } from "@/lib/format-date"
import type { DealReminder } from "../types"

interface ReminderRowProps {
  reminder: DealReminder
  canEdit: boolean
}

export function ReminderRow({ reminder, canEdit }: ReminderRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [askReschedule, setAskReschedule] = useState(false)

  const isDue =
    reminder.status === "active" && new Date(reminder.dueAt) <= new Date()
  const isPaused = reminder.status === "paused"

  function handleTogglePause() {
    startTransition(async () => {
      try {
        await updateReminder(reminder.id, {
          status: isPaused ? "active" : "paused",
        })
        router.refresh()
      } catch (err) {
        console.error("Toggle pause error:", err)
      }
    })
  }

  function finalizeDone(followUpInDays: number | null) {
    startTransition(async () => {
      try {
        await markReminderDone(reminder.id)
        if (followUpInDays !== null) {
          const next = new Date()
          next.setDate(next.getDate() + followUpInDays)
          await addReminder(reminder.dealId, reminder.note, next)
        }
        setAskReschedule(false)
        router.refresh()
      } catch (err) {
        console.error("Mark done error:", err)
      }
    })
  }

  function handleReschedule() {
    if (!editDate) return
    startTransition(async () => {
      try {
        const dateStr = editTime
          ? `${editDate}T${editTime}`
          : `${editDate}T09:00`
        await updateReminder(reminder.id, {
          dueAt: new Date(dateStr),
          status: "active",
        })
        setEditing(false)
        router.refresh()
      } catch (err) {
        console.error("Reschedule error:", err)
      }
    })
  }

  function startEditing() {
    const d = new Date(reminder.dueAt)
    setEditDate(d.toISOString().split("T")[0])
    setEditTime(d.toTimeString().slice(0, 5))
    setEditing(true)
  }

  return (
    <div
      className={`rounded p-2 text-sm ${
        isDue ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted"
      }`}
    >
      <div className="group flex items-center gap-2">
        <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">{reminder.note}</p>
          {editing && canEdit ? (
            <div className="mt-1 flex items-center gap-1">
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-6 w-28 text-xs"
              />
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="h-6 w-20 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={handleReschedule}
                disabled={isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p
              className={canEdit ? "cursor-pointer text-xs text-muted-foreground hover:underline" : "text-xs text-muted-foreground"}
              onClick={canEdit ? startEditing : undefined}
            >
              {formatDateTime(reminder.dueAt)}
            </p>
          )}
        </div>
        <Badge
          variant={isDue ? "destructive" : isPaused ? "secondary" : "outline"}
          className="shrink-0 text-xs"
        >
          {isDue ? "Due" : isPaused ? "Paused" : "Active"}
        </Badge>
        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleTogglePause}
              disabled={isPending}
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setAskReschedule(true)}
              disabled={isPending}
              title="Mark done"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await deleteReminder(reminder.id)
                    router.refresh()
                  } catch (err) {
                    console.error("Delete reminder error:", err)
                  }
                })
              }}
              disabled={isPending}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {askReschedule && canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
          <span className="text-xs text-muted-foreground">Follow up again in:</span>
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => finalizeDone(7)} disabled={isPending}>
            1 week
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => finalizeDone(14)} disabled={isPending}>
            2 weeks
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => finalizeDone(30)} disabled={isPending}>
            1 month
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => finalizeDone(null)} disabled={isPending}>
            No follow-up
          </Button>
        </div>
      )}
    </div>
  )
}
