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
import { createDeal } from "../actions"

export function AddDealDialog({ columnId }: { columnId: string }) {
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await createDeal({
      alias: formData.get("alias") as string,
      company: (formData.get("company") as string) || undefined,
      telegramHandle:
        (formData.get("telegramHandle") as string) || undefined,
      columnId,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-xs">
          <Plus className="mr-1 h-3 w-3" /> Add deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="alias" placeholder="Partner alias / name" required />
          <Input name="company" placeholder="Company (optional)" />
          <Input
            name="telegramHandle"
            placeholder="Telegram handle (optional)"
          />
          <Button type="submit" className="w-full">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
