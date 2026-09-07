"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Check, Trash2, ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createWorkspaceTask,
  setWorkspaceTaskCompleted,
  updateWorkspaceTaskText,
  deleteWorkspaceTask,
} from "../actions"
import type { WorkspaceTask } from "../types"

interface WorkspaceTodoPanelProps {
  initialTasks: WorkspaceTask[]
}

export function WorkspaceTodoPanel({ initialTasks }: WorkspaceTodoPanelProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [, startTransition] = useTransition()
  const [newText, setNewText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setTasks(initialTasks), [initialTasks])

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = newText.trim()
    if (!trimmed) return
    setNewText("")
    startTransition(async () => {
      await createWorkspaceTask(trimmed)
      router.refresh()
      inputRef.current?.focus()
    })
  }

  function handleToggle(task: WorkspaceTask) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t))
    )
    startTransition(async () => {
      await setWorkspaceTaskCompleted(task.id, !task.isCompleted)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    startTransition(async () => {
      await deleteWorkspaceTask(id)
      router.refresh()
    })
  }

  function handleRename(id: string, text: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)))
    startTransition(async () => {
      await updateWorkspaceTaskText(id, text)
      router.refresh()
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" /> To do
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a task..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newText.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing to do yet — add a task above.
          </p>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <WorkspaceTaskRow
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onDelete={() => handleDelete(task.id)}
                onRename={(text) => handleRename(task.id, text)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkspaceTaskRow({
  task,
  onToggle,
  onDelete,
  onRename,
}: {
  task: WorkspaceTask
  onToggle: () => void
  onDelete: () => void
  onRename: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(task.text)

  useEffect(() => setText(task.text), [task.text])

  function handleSave() {
    setEditing(false)
    const trimmed = text.trim()
    if (!trimmed || trimmed === task.text) {
      setText(task.text)
      return
    }
    onRename(trimmed)
  }

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50">
      <button
        onClick={onToggle}
        title={task.isCompleted ? "Mark not done" : "Mark done"}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          task.isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/40 hover:border-green-400"
        )}
      >
        {task.isCompleted && <Check className="h-2.5 w-2.5" />}
      </button>

      {editing ? (
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setText(task.text)
              setEditing(false)
            }
          }}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 cursor-text truncate text-sm transition-opacity",
            task.isCompleted && "text-muted-foreground line-through opacity-60"
          )}
        >
          {task.text}
        </span>
      )}

      <button
        onClick={onDelete}
        title="Delete task"
        className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
