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
import { createDeal } from "../actions"

export function AddDealDialog({ columnId }: { columnId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        const result = await createDeal({
          alias: formData.get("alias") as string,
          company: (formData.get("company") as string) || undefined,
          telegramHandle:
            (formData.get("telegramHandle") as string) || undefined,
          columnId,
        })
        if (!result.success) {
          console.error("Create deal failed:", result.error)
          alert("Failed to create deal: " + result.error)
          return
        }
        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error("Create deal error:", err)
        alert("Failed to create deal")
      }
    })
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
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
