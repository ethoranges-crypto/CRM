"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { workspaceTasks, workspaceNotes, workspaceProjects } from "./schema"
import { eq, asc } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { isProjectStatus } from "./project-status"
import type { WorkspaceTask, WorkspaceNote, WorkspaceProject } from "./types"

// This whole page is a private personal workspace — same visibility rule as
// the existing /todos page, not the shared read-only view deals/reminders get.

// ─── Tasks ───

export async function getWorkspaceTasks(): Promise<WorkspaceTask[]> {
  if (!(await getCanEdit())) return []
  return db.select().from(workspaceTasks).orderBy(asc(workspaceTasks.createdAt))
}

export async function createWorkspaceTask(text: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = text.trim()
  if (!trimmed) return
  await db.insert(workspaceTasks).values({ id: nanoid(), text: trimmed })
  revalidatePath("/workspace")
}

export async function updateWorkspaceTaskText(id: string, text: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = text.trim()
  if (!trimmed) return
  await db
    .update(workspaceTasks)
    .set({ text: trimmed, updatedAt: new Date() })
    .where(eq(workspaceTasks.id, id))
  revalidatePath("/workspace")
}

export async function setWorkspaceTaskCompleted(id: string, completed: boolean): Promise<void> {
  if (!(await getCanEdit())) return
  await db
    .update(workspaceTasks)
    .set({ isCompleted: completed, updatedAt: new Date() })
    .where(eq(workspaceTasks.id, id))
  revalidatePath("/workspace")
}

export async function deleteWorkspaceTask(id: string): Promise<void> {
  if (!(await getCanEdit())) return
  await db.delete(workspaceTasks).where(eq(workspaceTasks.id, id))
  revalidatePath("/workspace")
}

// ─── Notes ("Remember") ───

export async function getWorkspaceNotes(): Promise<WorkspaceNote[]> {
  if (!(await getCanEdit())) return []
  return db.select().from(workspaceNotes).orderBy(asc(workspaceNotes.createdAt))
}

export async function createWorkspaceNote(content: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = content.trim()
  if (!trimmed) return
  await db.insert(workspaceNotes).values({ id: nanoid(), content: trimmed })
  revalidatePath("/workspace")
}

export async function updateWorkspaceNote(id: string, content: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = content.trim()
  if (!trimmed) return
  await db
    .update(workspaceNotes)
    .set({ content: trimmed, updatedAt: new Date() })
    .where(eq(workspaceNotes.id, id))
  revalidatePath("/workspace")
}

export async function deleteWorkspaceNote(id: string): Promise<void> {
  if (!(await getCanEdit())) return
  await db.delete(workspaceNotes).where(eq(workspaceNotes.id, id))
  revalidatePath("/workspace")
}

// ─── Projects ("Project status") ───

export async function getWorkspaceProjects(): Promise<WorkspaceProject[]> {
  if (!(await getCanEdit())) return []
  return db.select().from(workspaceProjects).orderBy(asc(workspaceProjects.createdAt))
}

export async function createWorkspaceProject(name: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = name.trim()
  if (!trimmed) return
  await db.insert(workspaceProjects).values({ id: nanoid(), name: trimmed })
  revalidatePath("/workspace")
}

export async function updateWorkspaceProjectName(id: string, name: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = name.trim()
  if (!trimmed) return
  await db
    .update(workspaceProjects)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(workspaceProjects.id, id))
  revalidatePath("/workspace")
}

export async function updateWorkspaceProjectStatus(id: string, status: string): Promise<void> {
  if (!(await getCanEdit())) return
  if (!isProjectStatus(status)) return
  await db
    .update(workspaceProjects)
    .set({ status, updatedAt: new Date() })
    .where(eq(workspaceProjects.id, id))
  revalidatePath("/workspace")
}

export async function deleteWorkspaceProject(id: string): Promise<void> {
  if (!(await getCanEdit())) return
  await db.delete(workspaceProjects).where(eq(workspaceProjects.id, id))
  revalidatePath("/workspace")
}
