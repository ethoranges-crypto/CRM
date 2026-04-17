"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { todos } from "./schema"
import { eq, asc, and, or, isNull, lte, gte } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import type { Todo } from "./types"

function todayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Returns todos visible today:
//   - scheduledFor is null OR scheduledFor <= today
//   - isCompleted = false  OR  completedAt >= today midnight (same day)
export async function getTodos(): Promise<Todo[]> {
  if (!(await getCanEdit())) return []

  const midnight = todayMidnight()

  return db
    .select()
    .from(todos)
    .where(
      and(
        or(isNull(todos.scheduledFor), lte(todos.scheduledFor, midnight)),
        or(
          eq(todos.isCompleted, false),
          gte(todos.completedAt, midnight)
        )
      )
    )
    .orderBy(asc(todos.order))
}

export async function createTodo(data: {
  text: string
  isUrgent: boolean
  scheduledFor?: Date | null
}): Promise<void> {
  if (!(await getCanEdit())) return

  // Place new todo at end
  const all = await db.select({ order: todos.order }).from(todos).orderBy(asc(todos.order))
  const maxOrder = all.length > 0 ? all[all.length - 1].order + 1 : 0

  await db.insert(todos).values({
    id: nanoid(),
    text: data.text,
    isUrgent: data.isUrgent,
    scheduledFor: data.scheduledFor ?? null,
    order: maxOrder,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  revalidatePath("/todos")
}

export async function updateTodo(
  id: string,
  data: { text?: string; isUrgent?: boolean; scheduledFor?: Date | null }
): Promise<void> {
  if (!(await getCanEdit())) return

  await db
    .update(todos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(todos.id, id))

  revalidatePath("/todos")
}

export async function completeTodo(id: string, completed: boolean): Promise<void> {
  if (!(await getCanEdit())) return

  await db
    .update(todos)
    .set({
      isCompleted: completed,
      completedAt: completed ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, id))

  revalidatePath("/todos")
}

export async function deleteTodo(id: string): Promise<void> {
  if (!(await getCanEdit())) return
  await db.delete(todos).where(eq(todos.id, id))
  revalidatePath("/todos")
}

export async function reorderTodos(updates: { id: string; order: number }[]): Promise<void> {
  if (!(await getCanEdit())) return
  await Promise.all(
    updates.map((u) =>
      db.update(todos).set({ order: u.order }).where(eq(todos.id, u.id))
    )
  )
  revalidatePath("/todos")
}
