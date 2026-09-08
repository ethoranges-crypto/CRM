"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface NewStepFormProps {
  onSubmit: (text: string, date: string) => void
  onCancel: () => void
  isPending?: boolean
  placeholder?: string
}

// Shared "replace this with a fresh instruction" form used by Today's
// deal spotlight cards — distinct from just pushing the same next-action
// back to a later date, this lets you type a new one.
export function NewStepForm({
  onSubmit,
  onCancel,
  isPending,
  placeholder = "New next step...",
}: NewStepFormProps) {
  const [text, setText] = useState("")
  const [date, setDate] = useState("")

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex w-full flex-wrap items-center gap-1.5"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-7 min-w-[140px] flex-1 text-xs"
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="h-7 w-32 text-xs"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={isPending || !text.trim() || !date}
        onClick={() => onSubmit(text.trim(), date)}
      >
        Create
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
