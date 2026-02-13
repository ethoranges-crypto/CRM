"use client"

import { useState } from "react"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { DealCard } from "./deal-card"
import { DealCardDialog } from "./deal-card-dialog"
import { AddDealDialog } from "./add-deal-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, GripVertical, Pencil, Trash2 } from "lucide-react"
import { updateColumn, deleteColumn } from "../actions"
import { useDealsStore } from "../store"
import { cn } from "@/lib/utils"
import type { ColumnWithDeals, DealWithNotes, Label } from "../types"

interface KanbanColumnProps {
  column: ColumnWithDeals
  allLabels: Label[]
  isOverlay?: boolean
}

export function KanbanColumn({
  column,
  allLabels,
  isOverlay,
}: KanbanColumnProps) {
  const columns = useDealsStore((s) => s.columns)
  const dealIds = column.deals.map((d) => d.id)
  const [selectedDeal, setSelectedDeal] = useState<DealWithNotes | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(column.title)
  const [showDelete, setShowDelete] = useState(false)
  const [moveTarget, setMoveTarget] = useState<string>("")

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
  })

  const { setNodeRef: setDropRef } = useDroppable({
    id: `droppable-${column.id}`,
    data: { type: "column", columnId: column.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  async function handleRename() {
    if (editTitle.trim() && editTitle !== column.title) {
      await updateColumn(column.id, { title: editTitle.trim() })
    }
    setIsEditing(false)
  }

  async function handleDelete() {
    await deleteColumn(column.id, moveTarget || undefined)
    setShowDelete(false)
  }

  const otherColumns = columns.filter((c) => c.id !== column.id)

  return (
    <>
      <div
        ref={setSortableRef}
        style={style}
        className={cn(
          "flex w-72 shrink-0 flex-col rounded-lg bg-muted/50",
          isDragging && "opacity-30",
          isOverlay && "shadow-xl ring-2 ring-primary"
        )}
      >
        <div className="flex items-center gap-1 p-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
                if (e.key === "Escape") {
                  setEditTitle(column.title)
                  setIsEditing(false)
                }
              }}
              className="h-7 flex-1 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <h3
              className="flex-1 text-sm font-semibold"
              onDoubleClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
          )}

          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {column.deals.length}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-3 w-3" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDelete(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-3 w-3" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1 px-3">
          <SortableContext
            items={dealIds}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={setDropRef}
              className="flex min-h-[40px] flex-col gap-2 pb-3"
            >
              {column.deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  columnId={column.id}
                  onClick={() => setSelectedDeal(deal)}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>

        <div className="border-t p-2">
          <AddDealDialog columnId={column.id} />
        </div>
      </div>

      {selectedDeal && (
        <DealCardDialog
          deal={selectedDeal}
          allLabels={allLabels}
          open={!!selectedDeal}
          onOpenChange={(open) => {
            if (!open) setSelectedDeal(null)
          }}
        />
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{column.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {column.deals.length > 0
                ? `This column has ${column.deals.length} deal(s). Choose where to move them or delete them.`
                : "This column is empty and will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {column.deals.length > 0 && otherColumns.length > 0 && (
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Move deals to... (or leave empty to delete)" />
              </SelectTrigger>
              <SelectContent>
                {otherColumns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
