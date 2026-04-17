"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GripVertical, Pencil, Trash2, Check, X, AlertCircle, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { completeTodo, deleteTodo, updateTodo } from "../actions"
import type { Todo } from "../types"

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const [editUrgent, setEditUrgent] = useState(todo.isUrgent)
  const [editDate, setEditDate] = useState(
    todo.scheduledFor ? new Date(todo.scheduledFor).toISOString().split("T")[0] : ""
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleComplete() {
    startTransition(async () => {
      await completeTodo(todo.id, !todo.isCompleted)
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTodo(todo.id)
      router.refresh()
    })
  }

  function handleSave() {
    const trimmed = editText.trim()
    if (!trimmed) return
    startTransition(async () => {
      await updateTodo(todo.id, {
        text: trimmed,
        isUrgent: editUrgent,
        scheduledFor: editDate ? new Date(editDate + "T00:00:00") : null,
      })
      setEditing(false)
      router.refresh()
    })
  }

  function handleCancelEdit() {
    setEditText(todo.text)
    setEditUrgent(todo.isUrgent)
    setEditDate(
      todo.scheduledFor ? new Date(todo.scheduledFor).toISOString().split("T")[0] : ""
    )
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border bg-card p-3 transition-opacity",
        isDragging && "opacity-30",
        todo.isCompleted && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        disabled={isPending}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          todo.isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/40 hover:border-green-400"
        )}
      >
        {todo.isCompleted && <Check className="h-2.5 w-2.5" />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
                if (e.key === "Escape") handleCancelEdit()
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setEditUrgent((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors",
                  editUrgent
                    ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-red-300"
                )}
              >
                <AlertCircle className="h-3 w-3" />
                Urgent
              </button>
              <label className="flex items-center gap-1 text-muted-foreground">
                Show from:
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </label>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-6 px-2 text-xs" onClick={handleSave} disabled={isPending}>
                <Check className="mr-1 h-3 w-3" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {todo.isUrgent && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Urgent
                </span>
              )}
              <span
                className={cn(
                  "text-sm",
                  todo.isCompleted && "line-through text-muted-foreground"
                )}
              >
                {todo.text}
              </span>
            </div>
            {todo.scheduledFor && !todo.isCompleted && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                From {new Date(todo.scheduledFor).toLocaleDateString()}
              </p>
            )}
            {todo.isCompleted && todo.completedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Done {new Date(todo.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </>
        )}
      </div>

      {/* Actions — visible on hover */}
      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
