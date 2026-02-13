"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check, Pause, Play, Clock, Pencil, Trash2 } from "lucide-react"
import { updateReminder, markReminderDone, deleteReminder } from "../actions"
import type { DealReminder } from "../types"

interface ReminderPageRowProps {
  data: {
    reminder: DealReminder
    dealAlias: string
    dealCompany: string | null
  }
}

export function ReminderPageRow({ data }: ReminderPageRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { reminder, dealAlias, dealCompany } = data
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

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

  function handleDone() {
    startTransition(async () => {
      try {
        await markReminderDone(reminder.id)
        router.refresh()
      } catch (err) {
        console.error("Mark done error:", err)
      }
    })
  }

  function startEditing() {
    const d = new Date(reminder.dueAt)
    setEditDate(d.toISOString().split("T")[0])
    setEditTime(d.toTimeString().slice(0, 5))
    setEditing(true)
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

  return (
    <Card className={isDue ? "border-amber-300 dark:border-amber-700" : ""}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{dealAlias}</p>
            {dealCompany && (
              <span className="text-xs text-muted-foreground">
                {dealCompany}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm">{reminder.note}</p>
          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-7 w-32 text-xs"
              />
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="h-7 w-24 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleReschedule}
                disabled={isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {new Date(reminder.dueAt).toLocaleString()}
            </p>
          )}
        </div>
        <Badge
          variant={
            isDue ? "destructive" : isPaused ? "secondary" : "outline"
          }
          className="shrink-0"
        >
          {isDue ? "Due" : isPaused ? "Paused" : "Upcoming"}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDone}
            disabled={isPending}
            title="Mark done"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleTogglePause}
            disabled={isPending}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={startEditing}
            title="Reschedule"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
