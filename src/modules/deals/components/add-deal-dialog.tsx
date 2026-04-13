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
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { createDeal } from "../actions"

export function AddDealDialog({ columnId }: { columnId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        const result = await createDeal({
          company: formData.get("company") as string,
          alias: formData.get("alias") as string,
          telegramHandle: formData.get("telegramHandle") as string,
          columnId,
        })
        if (!result.success) {
          setError(result.error ?? "Failed to create deal")
          return
        }
        setOpen(false)
        router.refresh()
      } catch {
        setError("Failed to create deal")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError("") }}>
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
          <div className="space-y-1.5">
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" name="company" placeholder="e.g. Aave, Uniswap" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alias">Contact Name / Alias</Label>
            <Input id="alias" name="alias" placeholder="e.g. Stani K" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telegramHandle">Telegram Handle / Group</Label>
            <Input id="telegramHandle" name="telegramHandle" placeholder="e.g. @StaniKulechov" required />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
