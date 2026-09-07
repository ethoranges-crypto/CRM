"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateDeal, setActionTaken } from "../actions"

// Every handler stops propagation since these buttons live inside a card
// whose own onClick opens the full deal dialog.
function stop(e: React.MouseEvent) {
  e.stopPropagation()
}

// "Due in 7 days or less" cards are driven by nextAction/nextActionDate — a
// separate mechanism from the deal-reminders system, which is a common
// point of confusion (clearing a reminder does nothing to these fields).
// "Done" clears both, dropping the card off Today immediately. "Remind
// again in…" pushes the date out, which removes it from Today until it's
// back within the 7-day window — no separate snooze/resurface involved.
export function DueSoonQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDone(e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      await updateDeal(dealId, { nextAction: null, nextActionDate: null })
      router.refresh()
    })
  }

  function handleRemind(days: number, e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      const next = new Date()
      next.setDate(next.getDate() + days)
      await updateDeal(dealId, { nextActionDate: next })
      router.refresh()
    })
  }

  return (
    <div onClick={stop} className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={handleDone}
        disabled={isPending}
      >
        Done
      </Button>
      <span className="text-xs text-muted-foreground">Remind again in:</span>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => handleRemind(3, e)} disabled={isPending}>
        3d
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => handleRemind(7, e)} disabled={isPending}>
        1w
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => handleRemind(14, e)} disabled={isPending}>
        2w
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => handleRemind(21, e)} disabled={isPending}>
        3w
      </Button>
    </div>
  )
}

export function ColdQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleMarkContacted(e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      await updateDeal(dealId, { lastContactedAt: new Date() })
      router.refresh()
    })
  }

  return (
    <div onClick={stop} className="mt-2 border-t pt-2">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleMarkContacted} disabled={isPending}>
        Mark contacted today
      </Button>
    </div>
  )
}

export function ResurfacedQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDismiss(e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      await updateDeal(dealId, { snoozeUntil: null })
      router.refresh()
    })
  }

  return (
    <div onClick={stop} className="mt-2 border-t pt-2">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDismiss} disabled={isPending}>
        Dismiss
      </Button>
    </div>
  )
}

export function StaleActionQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClear(e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      await setActionTaken(dealId, false)
      router.refresh()
    })
  }

  return (
    <div onClick={stop} className="mt-2 border-t pt-2">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleClear} disabled={isPending}>
        Clear action
      </Button>
    </div>
  )
}
