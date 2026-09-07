"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import { formatDateTime } from "@/lib/format-date"
import { addWorkspaceProjectNote, deleteWorkspaceProjectNote } from "../actions"
import type { WorkspaceProjectWithNotes } from "../types"

interface WorkspaceProjectNotesDialogProps {
  project: WorkspaceProjectWithNotes
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkspaceProjectNotesDialog({
  project,
  open,
  onOpenChange,
}: WorkspaceProjectNotesDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState("")

  function handleAdd() {
    const trimmed = content.trim()
    if (!trimmed) return
    setContent("")
    startTransition(async () => {
      await addWorkspaceProjectNote(project.id, trimmed)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWorkspaceProjectNote(id)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-lg overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note about this project..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button onClick={handleAdd} size="sm" disabled={isPending || !content.trim()}>
              Add note
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {project.notes.length === 0 && (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          )}
          {project.notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-start justify-between rounded bg-muted p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words">{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(note.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                disabled={isPending}
                onClick={() => handleDelete(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
