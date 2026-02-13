"use server"

import { db } from "@/lib/db"
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
  const cols = db
    .select()
    .from(pipelineColumns)
    .orderBy(asc(pipelineColumns.order))
    .all()

  return cols.map((col) => {
    const colDeals = db
      .select()
      .from(deals)
      .where(eq(deals.columnId, col.id))
      .orderBy(asc(deals.order))
      .all()

    const dealsWithAll = colDeals.map((deal) => ({
      ...deal,
      notes: db
        .select()
        .from(dealNotes)
        .where(eq(dealNotes.dealId, deal.id))
        .orderBy(asc(dealNotes.createdAt))
        .all(),
      customFields: db
        .select()
        .from(dealCustomFields)
        .where(eq(dealCustomFields.dealId, deal.id))
        .orderBy(asc(dealCustomFields.createdAt))
        .all(),
      labels: db
        .select()
        .from(labels)
        .innerJoin(dealLabels, eq(dealLabels.labelId, labels.id))
        .where(eq(dealLabels.dealId, deal.id))
        .all()
        .map((row) => row.labels),
      reminders: db
        .select()
        .from(dealReminders)
        .where(eq(dealReminders.dealId, deal.id))
        .orderBy(asc(dealReminders.dueAt))
        .all(),
    }))

    return { ...col, deals: dealsWithAll }
  })
}

// ─── Deal CRUD ───

export async function createDeal(data: {
  alias: string
  company?: string
  telegramHandle?: string
  columnId: string
}): Promise<ActionResult> {
  try {
    const maxOrder = db
      .select({ order: deals.order })
      .from(deals)
      .where(eq(deals.columnId, data.columnId))
      .all()

    const nextOrder =
      maxOrder.length > 0 ? Math.max(...maxOrder.map((d) => d.order)) + 1 : 0

    db.insert(deals)
      .values({
        id: nanoid(),
        alias: data.alias,
        company: data.company || null,
        telegramHandle: data.telegramHandle || null,
        columnId: data.columnId,
        order: nextOrder,
      })
      .run()

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
  try {
    db.update(deals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deals.id, dealId))
      .run()

    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateDeal error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteDeal(dealId: string): Promise<ActionResult> {
  try {
    db.delete(deals).where(eq(deals.id, dealId)).run()
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
  try {
    db.transaction((tx) => {
      for (const update of updates) {
        tx.update(deals)
          .set({
            columnId: update.columnId,
            order: update.order,
            updatedAt: new Date(),
          })
          .where(eq(deals.id, update.id))
          .run()
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
  try {
    db.insert(dealNotes).values({ id: nanoid(), dealId, content }).run()
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("addNote error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  try {
    db.delete(dealNotes).where(eq(dealNotes.id, noteId)).run()
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
  try {
    db.insert(dealCustomFields)
      .values({ id: nanoid(), dealId, fieldName, fieldValue })
      .run()
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
  try {
    db.update(dealCustomFields)
      .set(data)
      .where(eq(dealCustomFields.id, fieldId))
      .run()
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
  try {
    db.delete(dealCustomFields)
      .where(eq(dealCustomFields.id, fieldId))
      .run()
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("deleteCustomField error:", err)
    return { success: false, error: String(err) }
  }
}

// ─── Labels ───

export async function getLabels(): Promise<Label[]> {
  return db.select().from(labels).orderBy(asc(labels.createdAt)).all()
}

export async function createLabel(name: string, color: string) {
  try {
    const id = nanoid()
    db.insert(labels).values({ id, name, color }).run()
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
  try {
    db.update(labels).set(data).where(eq(labels.id, labelId)).run()
    revalidatePath("/deals")
    return { success: true }
  } catch (err) {
    console.error("updateLabel error:", err)
    return { success: false, error: String(err) }
  }
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  try {
    db.delete(labels).where(eq(labels.id, labelId)).run()
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
  try {
    const existing = db
      .select()
      .from(dealLabels)
      .where(eq(dealLabels.dealId, dealId))
      .all()
      .find((r) => r.labelId === labelId)
    if (!existing) {
      db.insert(dealLabels).values({ dealId, labelId }).run()
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
  try {
    db.delete(dealLabels)
      .where(and(eq(dealLabels.dealId, dealId), eq(dealLabels.labelId, labelId)))
      .run()
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
  try {
    const maxOrder = db
      .select({ order: pipelineColumns.order })
      .from(pipelineColumns)
      .all()

    const nextOrder =
      maxOrder.length > 0
        ? Math.max(...maxOrder.map((c) => c.order)) + 1
        : 0

    const id = nanoid()
    db.insert(pipelineColumns).values({ id, title, order: nextOrder }).run()
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
  try {
    db.update(pipelineColumns)
      .set(data)
      .where(eq(pipelineColumns.id, columnId))
      .run()
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
  try {
    db.transaction((tx) => {
      if (moveDealsTo) {
        const existingDeals = tx
          .select({ order: deals.order })
          .from(deals)
          .where(eq(deals.columnId, moveDealsTo))
          .all()
        const maxOrder =
          existingDeals.length > 0
            ? Math.max(...existingDeals.map((d) => d.order))
            : -1

        const dealsToMove = tx
          .select()
          .from(deals)
          .where(eq(deals.columnId, columnId))
          .all()

        dealsToMove.forEach((deal, i) => {
          tx.update(deals)
            .set({
              columnId: moveDealsTo,
              order: maxOrder + 1 + i,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id))
            .run()
        })
      } else {
        tx.delete(deals).where(eq(deals.columnId, columnId)).run()
      }
      tx.delete(pipelineColumns)
        .where(eq(pipelineColumns.id, columnId))
        .run()
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
  try {
    db.transaction((tx) => {
      for (const update of updates) {
        tx.update(pipelineColumns)
          .set({ order: update.order })
          .where(eq(pipelineColumns.id, update.id))
          .run()
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
  try {
    // Server actions receive Date as ISO string from client serialization
    const dueDate = typeof dueAt === "string" ? new Date(dueAt) : dueAt
    db.insert(dealReminders)
      .values({ id: nanoid(), dealId, note, dueAt: dueDate, status: "active" })
      .run()
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
  try {
    // Server actions receive Date as ISO string from client serialization
    const updateData = { ...data, updatedAt: new Date() }
    if (typeof updateData.dueAt === "string") {
      updateData.dueAt = new Date(updateData.dueAt)
    }
    db.update(dealReminders)
      .set(
        updateData as {
          note?: string
          dueAt?: Date
          status?: string
          updatedAt: Date
        }
      )
      .where(eq(dealReminders.id, reminderId))
      .run()
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
  try {
    db.delete(dealReminders).where(eq(dealReminders.id, reminderId)).run()
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
  try {
    db.update(dealReminders)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(dealReminders.id, reminderId))
      .run()
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
    .all()
}

export async function getDueReminderCount(): Promise<number> {
  return db
    .select()
    .from(dealReminders)
    .where(
      and(
        eq(dealReminders.status, "active"),
        lte(dealReminders.dueAt, new Date())
      )
    )
    .all().length
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
    .all()
}
