"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { TodoItem } from "./todo-item"
import { reorderTodos } from "../actions"
import type { Todo } from "../types"

interface TodoListProps {
  initialTodos: Todo[]
}

export function TodoList({ initialTodos }: TodoListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [items, setItems] = useState<Todo[]>(initialTodos)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((t) => t.id === active.id)
    const newIndex = items.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    startTransition(async () => {
      await reorderTodos(reordered.map((t, i) => ({ id: t.id, order: i })))
      router.refresh()
    })
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No tasks for today. Add one above.
      </p>
    )
  }

  // Split: urgent first, then normal; completed at bottom
  const urgentPending = items.filter((t) => t.isUrgent && !t.isCompleted)
  const normalPending = items.filter((t) => !t.isUrgent && !t.isCompleted)
  const completed = items.filter((t) => t.isCompleted)
  const sorted = [...urgentPending, ...normalPending, ...completed]

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sorted.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
