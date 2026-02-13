"use client"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tags } from "lucide-react"
import { assignLabel, removeLabel } from "../actions"
import type { Label } from "../types"

interface LabelPickerProps {
  dealId: string
  allLabels: Label[]
  assignedLabelIds: string[]
}

export function LabelPicker({
  dealId,
  allLabels,
  assignedLabelIds,
}: LabelPickerProps) {
  async function handleToggle(labelId: string, isAssigned: boolean) {
    if (isAssigned) {
      await removeLabel(dealId, labelId)
    } else {
      await assignLabel(dealId, labelId)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <Tags className="mr-1 h-3 w-3" /> Manage Labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {allLabels.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            No labels yet. Create labels from the page header.
          </p>
        ) : (
          <div className="space-y-1">
            {allLabels.map((label) => {
              const isAssigned = assignedLabelIds.includes(label.id)
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggle(label.id, isAssigned)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border"
                    style={{
                      backgroundColor: isAssigned ? label.color : "transparent",
                      borderColor: label.color,
                    }}
                  />
                  <span>{label.name}</span>
                  {isAssigned && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
