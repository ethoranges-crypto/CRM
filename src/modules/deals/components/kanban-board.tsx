"use client"

import { useEffect, useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { useDealsStore } from "../store"
import { reorderDeals, reorderColumns } from "../actions"
import { KanbanColumn } from "./kanban-column"
import { DealCard } from "./deal-card"
import { AddColumnButton } from "./add-column-button"
import type { ColumnWithDeals, Label } from "../types"

interface KanbanBoardProps {
  initialData: ColumnWithDeals[]
  allLabels: Label[]
  canEdit: boolean
}

export function KanbanBoard({ initialData, allLabels, canEdit }: KanbanBoardProps) {
  const {
    columns,
    setColumns,
    activeDeal,
    setActiveDeal,
    activeColumn,
    setActiveColumn,
    moveCard,
  } = useDealsStore()

  const [activeType, setActiveType] = useState<"card" | "column" | null>(null)
  const [showLabelText, setShowLabelText] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("kanban-label-text") === "true"
  })

  const handleToggleLabelText = useCallback(() => {
    setShowLabelText((prev) => {
      const next = !prev
      localStorage.setItem("kanban-label-text", String(next))
      return next
    })
  }, [])

  useEffect(() => {
    setColumns(initialData)
  }, [initialData, setColumns])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    if (!canEdit) return
    const type = event.active.data.current?.type as string

    if (type === "column") {
      const col = columns.find((c) => c.id === event.active.id)
      setActiveColumn(col ?? null)
      setActiveType("column")
    } else {
      const deal = columns
        .flatMap((c) => c.deals)
        .find((d) => d.id === event.active.id)
      setActiveDeal(deal ?? null)
      setActiveType("card")
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canEdit) return
    const { active, over } = event
    if (!over) return
    if (active.data.current?.type !== "card") return

    const activeColId = active.data.current?.columnId as string

    let overColId: string | undefined
    if (over.data.current?.type === "card") {
      overColId = over.data.current?.columnId as string
    } else if (over.data.current?.columnId) {
      overColId = over.data.current?.columnId as string
    } else {
      overColId = over.id as string
    }

    if (activeColId && overColId && activeColId !== overColId) {
      const overIndex = over.data.current?.sortable?.index ?? 0
      moveCard(active.id as string, activeColId, overColId, overIndex)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!canEdit) return
    const { active, over } = event

    setActiveDeal(null)
    setActiveColumn(null)
    setActiveType(null)

    if (!over) return

    if (active.data.current?.type === "column") {
      let overId = over.id as string
      if (over.data.current?.columnId) {
        overId = over.data.current.columnId as string
      } else if (typeof overId === "string" && overId.startsWith("droppable-")) {
        overId = overId.replace(/^droppable-/, "")
      }

      if (active.id !== overId) {
        const oldIndex = columns.findIndex((c) => c.id === active.id)
        const newIndex = columns.findIndex((c) => c.id === overId)
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(columns, oldIndex, newIndex).map(
            (col, i) => ({ ...col, order: i })
          )
          setColumns(reordered)
          const updates = reordered.map((col, i) => ({ id: col.id, order: i }))
          await reorderColumns(updates)
        }
      }
    } else {
      const activeColId = active.data.current?.columnId as string
      let overColId: string | undefined
      if (over.data.current?.type === "card") {
        overColId = over.data.current?.columnId as string
      } else if (over.data.current?.columnId) {
        overColId = over.data.current?.columnId as string
      } else {
        overColId = over.id as string
      }

      if (activeColId === overColId && active.id !== over.id) {
        const col = columns.find((c) => c.id === activeColId)
        if (col) {
          const oldIndex = col.deals.findIndex((d) => d.id === active.id)
          const newIndex = col.deals.findIndex((d) => d.id === over.id)
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            moveCard(active.id as string, activeColId, activeColId, newIndex)
          }
        }
      }

      const updates = columns.flatMap((col) =>
        col.deals.map((deal, index) => ({
          id: deal.id,
          columnId: col.id,
          order: index,
        }))
      )
      await reorderDeals(updates)
    }
  }

  const columnIds = columns.map((c) => c.id)

  if (!canEdit) {
    // Read-only: simple static layout, no DnD
    return (
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            allLabels={allLabels}
            canEdit={false}
            showLabelText={showLabelText}
            onToggleLabelText={handleToggleLabelText}
          />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={columnIds}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex h-full gap-4 overflow-x-auto p-6">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              allLabels={allLabels}
              canEdit={true}
              showLabelText={showLabelText}
              onToggleLabelText={handleToggleLabelText}
            />
          ))}
          <AddColumnButton />
        </div>
      </SortableContext>

      <DragOverlay>
        {activeType === "column" && activeColumn ? (
          <KanbanColumn
            column={activeColumn}
            allLabels={allLabels}
            canEdit={true}
            isOverlay
          />
        ) : activeType === "card" && activeDeal ? (
          <DealCard deal={activeDeal} isOverlay showLabelText={showLabelText} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
