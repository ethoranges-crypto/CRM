"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateDeal, setActionTaken } from "../actions"
import { NewStepForm } from "./new-step-form"

// Every handler stops propagation since these buttons live inside a card
// whose own onClick opens the full deal dialog.
function stop(e: React.MouseEvent) {
  e.stopPropagation()
}

// Every deal-driven Today bucket (Overdue, Due Today, Due This Week, Later)
// shares this same set of actions on its next-step cards. "Done" clears the
// next step, dropping the card off Today immediately. "Remind again in…"
// pushes the date out without changing the instruction. "New step" replaces
// the instruction itself, for when the next action has changed rather than
// just its timing.
export function NextStepQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newStepOpen, setNewStepOpen] = useState(false)

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

  function handleNewStep(text: string, date: string) {
    startTransition(async () => {
      await updateDeal(dealId, { nextAction: text, nextActionDate: new Date(date) })
      setNewStepOpen(false)
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
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={(e) => { stop(e); setNewStepOpen((v) => !v) }}
        disabled={isPending}
      >
        New step
      </Button>
      {newStepOpen && (
        <div className="mt-2 w-full border-t pt-2">
          <NewStepForm
            onSubmit={handleNewStep}
            onCancel={() => setNewStepOpen(false)}
            isPending={isPending}
            placeholder="New next step..."
          />
        </div>
      )}
    </div>
  )
}

export function StaleActionQuickActions({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newStepOpen, setNewStepOpen] = useState(false)

  function handleClear(e: React.MouseEvent) {
    stop(e)
    startTransition(async () => {
      await setActionTaken(dealId, false)
      router.refresh()
    })
  }

  function handleNewStep(text: string, date: string) {
    startTransition(async () => {
      await setActionTaken(dealId, false)
      await updateDeal(dealId, { nextAction: text, nextActionDate: new Date(date) })
      setNewStepOpen(false)
      router.refresh()
    })
  }

  return (
    <div onClick={stop} className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleClear} disabled={isPending}>
        Clear action
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
        onClick={(e) => { stop(e); setNewStepOpen((v) => !v) }}
        disabled={isPending}
      >
        New step
      </Button>
      {newStepOpen && (
        <div className="mt-2 w-full border-t pt-2">
          <NewStepForm
            onSubmit={handleNewStep}
            onCancel={() => setNewStepOpen(false)}
            isPending={isPending}
            placeholder="New next step..."
          />
        </div>
      )}
    </div>
  )
}
