"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pause, Play, Check, Trash2, Clock } from "lucide-react"
import { updateReminder, deleteReminder, markReminderDone } from "../actions"
import type { DealReminder } from "../types"

interface ReminderRowProps {
  reminder: DealReminder
}

export function ReminderRow({ reminder }: ReminderRowProps) {
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

  const isDue =
    reminder.status === "active" && new Date(reminder.dueAt) <= new Date()
  const isPaused = reminder.status === "paused"

  async function handleTogglePause() {
    await updateReminder(reminder.id, {
      status: isPaused ? "active" : "paused",
    })
  }

  async function handleDone() {
    await markReminderDone(reminder.id)
  }

  async function handleReschedule() {
    if (!editDate) return
    const dateStr = editTime
      ? `${editDate}T${editTime}`
      : `${editDate}T09:00`
    await updateReminder(reminder.id, {
      dueAt: new Date(dateStr),
      status: "active",
    })
    setEditing(false)
  }

  function startEditing() {
    const d = new Date(reminder.dueAt)
    setEditDate(d.toISOString().split("T")[0])
    setEditTime(d.toTimeString().slice(0, 5))
    setEditing(true)
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded p-2 text-sm ${
        isDue ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted"
      }`}
    >
      <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{reminder.note}</p>
        {editing ? (
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
            className="cursor-pointer text-xs text-muted-foreground hover:underline"
            onClick={startEditing}
          >
            {new Date(reminder.dueAt).toLocaleString()}
          </p>
        )}
      </div>
      <Badge
        variant={isDue ? "destructive" : isPaused ? "secondary" : "outline"}
        className="shrink-0 text-xs"
      >
        {isDue ? "Due" : isPaused ? "Paused" : "Active"}
      </Badge>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleTogglePause}
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
          onClick={handleDone}
          title="Mark done"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => deleteReminder(reminder.id)}
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
