"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Trophy } from "lucide-react"
import {
  createWorkspaceAchievement,
  updateWorkspaceAchievementText,
  deleteWorkspaceAchievement,
} from "../actions"
import type { WorkspaceAchievement } from "../types"

interface WorkspaceAchievementsPanelProps {
  initialAchievements: WorkspaceAchievement[]
}

// A permanent log of wins, good ideas, and deals done — same add/edit/delete
// pattern as the To-do panel, minus the checkbox: entries here are never
// "done", so they're never ticked and never get cleared out.
export function WorkspaceAchievementsPanel({ initialAchievements }: WorkspaceAchievementsPanelProps) {
  const router = useRouter()
  const [achievements, setAchievements] = useState(initialAchievements)
  const [, startTransition] = useTransition()
  const [newText, setNewText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setAchievements(initialAchievements), [initialAchievements])

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = newText.trim()
    if (!trimmed) return
    setNewText("")
    startTransition(async () => {
      await createWorkspaceAchievement(trimmed)
      router.refresh()
      inputRef.current?.focus()
    })
  }

  function handleDelete(id: string) {
    setAchievements((prev) => prev.filter((a) => a.id !== id))
    startTransition(async () => {
      await deleteWorkspaceAchievement(id)
      router.refresh()
    })
  }

  function handleRename(id: string, text: string) {
    setAchievements((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)))
    startTransition(async () => {
      await updateWorkspaceAchievementText(id, text)
      router.refresh()
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" /> Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Log a win..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newText.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {achievements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No achievements logged yet — add your first win.
          </p>
        ) : (
          <div className="space-y-1">
            {achievements.map((achievement) => (
              <WorkspaceAchievementRow
                key={achievement.id}
                achievement={achievement}
                onDelete={() => handleDelete(achievement.id)}
                onRename={(text) => handleRename(achievement.id, text)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkspaceAchievementRow({
  achievement,
  onDelete,
  onRename,
}: {
  achievement: WorkspaceAchievement
  onDelete: () => void
  onRename: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(achievement.text)

  useEffect(() => setText(achievement.text), [achievement.text])

  function handleSave() {
    setEditing(false)
    const trimmed = text.trim()
    if (!trimmed || trimmed === achievement.text) {
      setText(achievement.text)
      return
    }
    onRename(trimmed)
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50">
      {editing ? (
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setText(achievement.text)
              setEditing(false)
            }
          }}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 cursor-text whitespace-normal break-words py-0.5 text-sm"
        >
          {achievement.text}
        </span>
      )}

      <button
        onClick={onDelete}
        title="Delete achievement"
        className="mt-0.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
