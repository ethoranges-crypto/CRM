"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tags, Trash2, Pencil } from "lucide-react"
import { createLabel, updateLabel, deleteLabel } from "../actions"
import type { Label } from "../types"

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
]

interface LabelManagerProps {
  initialLabels: Label[]
}

export function LabelManager({ initialLabels }: LabelManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      try {
        const result = await createLabel(newName.trim(), newColor)
        if (result) {
          setLabels([
            ...labels,
            { ...result, createdAt: new Date() } as Label,
          ])
          setNewName("")
          router.refresh()
        }
      } catch (err) {
        console.error("Create label error:", err)
      }
    })
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      try {
        await updateLabel(id, { name: editName, color: editColor })
        setLabels(
          labels.map((l) =>
            l.id === id ? { ...l, name: editName, color: editColor } : l
          )
        )
        setEditingId(null)
        router.refresh()
      } catch (err) {
        console.error("Update label error:", err)
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteLabel(id)
        setLabels(labels.filter((l) => l.id !== id))
        router.refresh()
      } catch (err) {
        console.error("Delete label error:", err)
      }
    })
  }

  function startEdit(label: Label) {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tags className="mr-1 h-4 w-4" /> Labels
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Existing labels */}
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2">
              {editingId === label.id ? (
                <>
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className="h-5 w-5 rounded-full border-2"
                        style={{
                          backgroundColor: c,
                          borderColor:
                            editColor === c ? "white" : "transparent",
                          boxShadow:
                            editColor === c ? `0 0 0 2px ${c}` : "none",
                        }}
                      />
                    ))}
                  </div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(label.id)}
                    disabled={isPending}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 text-sm">{label.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => startEdit(label)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDelete(label.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Create new label */}
          <div className="space-y-2 rounded-md border p-2">
            <p className="text-xs font-medium">New Label</p>
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: newColor === c ? "white" : "transparent",
                    boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || isPending}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
