"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { createTodo } from "../actions"

export function AddTodoForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [text, setText] = useState("")
  const [isUrgent, setIsUrgent] = useState(false)
  const [scheduledFor, setScheduledFor] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    startTransition(async () => {
      await createTodo({
        text: trimmed,
        isUrgent,
        scheduledFor: scheduledFor ? new Date(scheduledFor + "T00:00:00") : null,
      })
      setText("")
      setIsUrgent(false)
      setScheduledFor("")
      router.refresh()
      inputRef.current?.focus()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task..."
          className="flex-1"
          disabled={isPending}
        />
        <Button type="submit" size="sm" disabled={!text.trim() || isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Urgent toggle */}
        <button
          type="button"
          onClick={() => setIsUrgent((v) => !v)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors",
            isUrgent
              ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              : "border-muted-foreground/30 text-muted-foreground hover:border-red-300 hover:text-red-500"
          )}
        >
          <AlertCircle className="h-3 w-3" />
          Urgent
        </button>

        {/* Schedule date */}
        <label className="flex items-center gap-1 text-muted-foreground">
          Show from:
          <input
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>
    </form>
  )
}
