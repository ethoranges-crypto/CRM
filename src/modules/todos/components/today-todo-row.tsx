"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Check, AlertCircle } from "lucide-react"
import { completeTodo } from "../actions"
import type { Todo } from "../types"

interface TodayTodoRowProps {
  todo: Todo
}

export function TodayTodoRow({ todo }: TodayTodoRowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCompleted, setIsCompleted] = useState(todo.isCompleted)

  function handleComplete() {
    setIsCompleted(true)
    startTransition(async () => {
      await completeTodo(todo.id, true)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/40 hover:border-green-400"
        )}
      >
        {isCompleted && <Check className="h-2.5 w-2.5" />}
      </button>
      <span
        className={cn(
          "flex-1 text-sm",
          isCompleted && "text-muted-foreground line-through"
        )}
      >
        {todo.text}
      </span>
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
    </div>
  )
}
