"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import {
  deals,
  dealNotes,
  dealCustomFields,
  pipelineColumns,
  labels,
  dealLabels,
  dealReminders,
} from "./schema"
import { eq, asc, and, lte, or } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import type { ColumnWithDeals, Label, DealReminder } from "./types"

// ─── Result type for mutations ───

type ActionResult = { success: true } | { success: false; error: string }

// ─── Columns with deals (includes custom fields + labels) ───

export async function getColumnsWithDeals(): Promise<ColumnWithDeals[]> {
  const cols = await db
    .select()
    .from(pipelineColumns)
    .orderBy(asc(pipelineColumns.order))

  return Promise.all(
    cols.map(async (col) => {
      const colDeals = await db
        .select()
        .from(deals)
        .where(eq(deals.columnId, col.id))
        .orderBy(asc(deals.order))

      const dealsWithAll = await Promise.all(
        colDeals.map(async (deal) => {
          const [notes, customFields, labelRows, reminders] = await Promise.all([
            db
              .select()
              .from(dealNotes)
              .where(eq(dealNotes.dealId, deal.id))
              .orderBy(asc(dealNotes.createdAt)),
            db
              .select()
              .from(dealCustomFields)
              .where(eq(dealCustomFields.dealId, deal.id))
              .orderBy(asc(dealCustomFields.createdAt)),
            db
              .select()
              .from(labels)
              .innerJoin(dealLabels, eq(dealLabels.labelId, labels.id))
              .where(eq(dealLabels.dealId, deal.id)),
            db
              .select()
              .from(dealReminders)
              .where(eq(dealReminders.dealId, deal.id))
              .orderBy(asc(dealReminders.dueAt)),
          ])

          return {
            ...deal,
            notes,
            customFields,
            labels: labelRows.map((row) => row.labels),
            reminders,
          }
        })
      )

      return { ...col, deals: dealsWithAll }
    })
  )
}

// ─── Deal CRUD ───

export async function createDeal(data: {
  alias: string
  company: string
  telegramHandle: string
  columnId: string
}): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    const existing = await db
      .select({ order: deals.order })
      .from(deals)
      .where(eq(deals.columnId, data.columnId))

    const nextOrder =
      existing.length > 0 ? Math.max(...existing.map((d) => d.order)) + 1 : 0

    await db.insert(deals).values({
      id: nanoid(),
      alias: data.alias,
      company: data.company,
      telegramHandle: data.telegramHandle,
      columnId: data.columnId,
      order: nextOrder,
    })

    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("createDeal error:", err)
    return { success: false, error: String(err) }
  }
}

export async function updateDeal(
  dealId: string,
  data: { alias?: string; company?: string; telegramHandle?: string }
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, dealId))

    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateDeal error:", err)
    return { success: false, error: String(err) }
  }
}

export async function setActionTaken(
  dealId: string,
  taken: boolean
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .update(deals)
      .set({ actionTakenAt: taken ? new Date() : null, updatedAt: new Date() })
      .where(eq(deals.id, dealId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("setActionTaken error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.delete(deals).where(eq(deals.id, dealId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteDeal error:", err)
    return { success: false, error: String(err) }
  }
}

export async function reorderDeals(
  updates: Array<{ id: string; columnId: string; order: number }>
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(deals)
          .set({
            columnId: update.columnId,
            order: update.order,
            updatedAt: new Date(),
          })
          .where(eq(deals.id, update.id))
      }
    })
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("reorderDeals error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Notes ───

export async function addNote(
  dealId: string,
  content: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.insert(dealNotes).values({ id: nanoid(), dealId, content })
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("addNote error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.delete(dealNotes).where(eq(dealNotes.id, noteId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteNote error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Custom Fields ───

export async function addCustomField(
  dealId: string,
  fieldName: string,
  fieldValue: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .insert(dealCustomFields)
      .values({ id: nanoid(), dealId, fieldName, fieldValue })
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("addCustomField error:", err)
    return { success: false, error: String(err) }
  }
}

export async function updateCustomField(
  fieldId: string,
  data: { fieldName?: string; fieldValue?: string }
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .update(dealCustomFields)
      .set(data)
      .where(eq(dealCustomFields.id, fieldId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateCustomField error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteCustomField(
  fieldId: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .delete(dealCustomFields)
      .where(eq(dealCustomFields.id, fieldId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteCustomField error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Labels ───

export async function getLabels(): Promise<Label[]> {
  return db.select().from(labels).orderBy(asc(labels.createdAt))
}

export async function createLabel(name: string, color: string) {
  if (!(await getCanEdit())) return null
  try {
    const id = nanoid()
    await db.insert(labels).values({ id, name, color })
    revalidatePath("/deals")
    return { id, name, color }
  } catch (err) {
    console.error("createLabel error:", err)
    return null
  }
}

export async function updateLabel(
  labelId: string,
  data: { name?: string; color?: string }
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.update(labels).set(data).where(eq(labels.id, labelId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateLabel error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.delete(labels).where(eq(labels.id, labelId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteLabel error:", err)
    return { success: false, error: String(err) }
  }
}

export async function assignLabel(
  dealId: string,
  labelId: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    const existing = await db
      .select()
      .from(dealLabels)
      .where(and(eq(dealLabels.dealId, dealId), eq(dealLabels.labelId, labelId)))
    if (existing.length === 0) {
      await db.insert(dealLabels).values({ dealId, labelId })
      revalidatePath("/deals")
    }
    return { success: true }
  } catch (err) {
    console.error("assignLabel error:", err)
    return { success: false, error: String(err) }
  }
}

export async function removeLabel(
  dealId: string,
  labelId: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .delete(dealLabels)
      .where(and(eq(dealLabels.dealId, dealId), eq(dealLabels.labelId, labelId)))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("removeLabel error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Pipeline Columns ───

export async function createColumn(
  title: string
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    const existing = await db
      .select({ order: pipelineColumns.order })
      .from(pipelineColumns)

    const nextOrder =
      existing.length > 0
        ? Math.max(...existing.map((c) => c.order)) + 1
        : 0

    const id = nanoid()
    await db.insert(pipelineColumns).values({ id, title, order: nextOrder })
    revalidatePath("/deals")
    return { success: true, id }
  } catch (err) {
    console.error("createColumn error:", err)
    return { success: false, error: String(err) }
  }
}

export async function updateColumn(
  columnId: string,
  data: { title?: string }
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .update(pipelineColumns)
      .set(data)
      .where(eq(pipelineColumns.id, columnId))
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateColumn error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteColumn(
  columnId: string,
  moveDealsTo?: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.transaction(async (tx) => {
      if (moveDealsTo) {
        const existingDeals = await tx
          .select({ order: deals.order })
          .from(deals)
          .where(eq(deals.columnId, moveDealsTo))

        const maxOrder =
          existingDeals.length > 0
            ? Math.max(...existingDeals.map((d) => d.order))
            : -1

        const dealsToMove = await tx
          .select()
          .from(deals)
          .where(eq(deals.columnId, columnId))

        for (let i = 0; i < dealsToMove.length; i++) {
          await tx
            .update(deals)
            .set({
              columnId: moveDealsTo,
              order: maxOrder + 1 + i,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, dealsToMove[i].id))
        }
      } else {
        await tx.delete(deals).where(eq(deals.columnId, columnId))
      }
      await tx.delete(pipelineColumns).where(eq(pipelineColumns.id, columnId))
    })
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteColumn error:", err)
    return { success: false, error: String(err) }
  }
}

export async function reorderColumns(
  updates: Array<{ id: string; order: number }>
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(pipelineColumns)
          .set({ order: update.order })
          .where(eq(pipelineColumns.id, update.id))
      }
    })
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("reorderColumns error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Reminders ───

export async function addReminder(
  dealId: string,
  note: string,
  dueAt: Date | string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt
    await db
      .insert(dealReminders)
      .values({ id: nanoid(), dealId, note, dueAt: dueDate, status: "active" })
    revalidatePath("/deals")
    revalidatePath("/reminders")
    return { success: true }
  } catch (err) {
    console.error("addReminder error:", err)
    return { success: false, error: String(err) }
  }
}

export async function updateReminder(
  reminderId: string,
  data: { note?: string; dueAt?: Date | string; status?: string }
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    const updateData: { note?: string; dueAt?: Date | string; status?: string; updatedAt: Date } = {
      ...data,
      updatedAt: new Date(),
    }
    if (typeof updateData.dueAt === "string") {
      updateData.dueAt = new Date(updateData.dueAt)
    }
    await db
      .update(dealReminders)
      .set(updateData as { note?: string; dueAt?: Date; status?: string; updatedAt: Date })
      .where(eq(dealReminders.id, reminderId))
    revalidatePath("/deals")
    revalidatePath("/reminders")
    return { success: true }
  } catch (err) {
    console.error("updateReminder error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteReminder(
  reminderId: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db.delete(dealReminders).where(eq(dealReminders.id, reminderId))
    revalidatePath("/deals")
    revalidatePath("/reminders")
    return { success: true }
  } catch (err) {
    console.error("deleteReminder error:", err)
    return { success: false, error: String(err) }
  }
}

export async function markReminderDone(
  reminderId: string
): Promise<ActionResult> {
  if (!(await getCanEdit())) return { success: false, error: "Unauthorized" }
  try {
    await db
      .update(dealReminders)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(dealReminders.id, reminderId))
    revalidatePath("/deals")
    revalidatePath("/reminders")
    return { success: true }
  } catch (err) {
    console.error("markReminderDone error:", err)
    return { success: false, error: String(err) }
  }
}

export async function getDueReminders(): Promise<DealReminder[]> {
  return db
    .select()
    .from(dealReminders)
    .where(
      and(
        eq(dealReminders.status, "active"),
        lte(dealReminders.dueAt, new Date())
      )
    )
}

export async function getDueReminderCount(): Promise<number> {
  const rows = await db
    .select()
    .from(dealReminders)
    .where(
      and(
        eq(dealReminders.status, "active"),
        lte(dealReminders.dueAt, new Date())
      )
    )
  return rows.length
}

export async function getAllActiveReminders() {
  return db
    .select({
      reminder: dealReminders,
      dealAlias: deals.alias,
      dealCompany: deals.company,
    })
    .from(dealReminders)
    .innerJoin(deals, eq(deals.id, dealReminders.dealId))
    .where(
      or(
        eq(dealReminders.status, "active"),
        eq(dealReminders.status, "paused")
      )
    )
    .orderBy(asc(dealReminders.dueAt))
}
