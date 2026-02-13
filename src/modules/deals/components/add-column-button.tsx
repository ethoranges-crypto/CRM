"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { createColumn } from "../actions"

export function AddColumnButton() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")

  async function handleCreate() {
    if (!title.trim()) return
    await createColumn(title.trim())
    setTitle("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex h-10 w-72 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground">
          <Plus className="h-4 w-4" /> Add Column
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>New Column</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="space-y-4"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Column name"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={!title.trim()}>
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
