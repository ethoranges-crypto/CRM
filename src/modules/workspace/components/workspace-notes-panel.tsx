"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"
import { createWorkspaceNote, updateWorkspaceNote, deleteWorkspaceNote } from "../actions"
import type { WorkspaceNote } from "../types"

interface WorkspaceNotesPanelProps {
  initialNotes: WorkspaceNote[]
}

// Alternating tilt gives the sticky-note pile a slightly scattered feel
// without going full skeuomorphic — still uses the app's own card/border
// conventions, just recoloured and rotated.
const TILTS = ["-rotate-1", "rotate-1", "rotate-0"]

export function WorkspaceNotesPanel({ initialNotes }: WorkspaceNotesPanelProps) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [, startTransition] = useTransition()
  const [newContent, setNewContent] = useState("")

  useEffect(() => setNotes(initialNotes), [initialNotes])

  function handleAdd() {
    const trimmed = newContent.trim()
    if (!trimmed) return
    setNewContent("")
    startTransition(async () => {
      await createWorkspaceNote(trimmed)
      router.refresh()
    })
  }

  function handleUpdate(id: string, content: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)))
    startTransition(async () => {
      await updateWorkspaceNote(id, content)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    startTransition(async () => {
      await deleteWorkspaceNote(id)
      router.refresh()
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4" /> Remember
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-2">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Something to keep in mind..."
            className="min-h-[60px] text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newContent.trim()}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add note
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing to remember yet — add a note above.
          </p>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-3 content-start sm:grid-cols-2">
            {notes.map((note, i) => (
              <WorkspaceNoteCard
                key={note.id}
                note={note}
                tiltClassName={TILTS[i % TILTS.length]}
                onUpdate={(content) => handleUpdate(note.id, content)}
                onDelete={() => handleDelete(note.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkspaceNoteCard({
  note,
  tiltClassName,
  onUpdate,
  onDelete,
}: {
  note: WorkspaceNote
  tiltClassName: string
  onUpdate: (content: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)

  useEffect(() => setContent(note.content), [note.content])

  function handleSave() {
    setEditing(false)
    const trimmed = content.trim()
    if (!trimmed || trimmed === note.content) {
      setContent(note.content)
      return
    }
    onUpdate(trimmed)
  }

  return (
    <div
      className={cn(
        "group relative rounded-md border border-amber-300/60 bg-amber-100 p-3 shadow-sm transition-transform hover:z-10 hover:scale-[1.02] hover:rotate-0 dark:border-amber-800/60 dark:bg-amber-950/40",
        tiltClassName
      )}
    >
      <button
        onClick={onDelete}
        title="Delete note"
        className="absolute right-1.5 top-1.5 text-amber-700/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 dark:text-amber-400/40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {editing ? (
        <Textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setContent(note.content)
              setEditing(false)
            }
          }}
          className="min-h-[70px] border-none bg-transparent p-0 text-sm text-amber-950 shadow-none focus-visible:ring-0 dark:text-amber-100"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="min-h-[70px] cursor-text whitespace-pre-wrap break-words pr-4 text-sm text-amber-950 dark:text-amber-100"
        >
          {note.content}
        </p>
      )}
    </div>
  )
}
