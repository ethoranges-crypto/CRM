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
import { Plus } from "lucide-react"
import { createColumn } from "../actions"

export function AddColumnButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [isPending, startTransition] = useTransition()

  async function handleCreate() {
    if (!title.trim()) return
    startTransition(async () => {
      try {
        const result = await createColumn(title.trim())
        if (!result.success) {
          console.error("Create column failed:", result.error)
          alert("Failed to create column: " + result.error)
          return
        }
        setTitle("")
        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error("Create column error:", err)
        alert("Failed to create column")
      }
    })
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
          <Button
            type="submit"
            className="w-full"
            disabled={!title.trim() || isPending}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
