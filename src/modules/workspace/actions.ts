"use server"

import { db } from "@/lib/db"
import { getCanEdit } from "@/lib/auth"
import { workspaceTasks, workspaceNotes, workspaceProjects, workspaceProjectNotes } from "./schema"
import { eq, asc, desc, and, lt } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { isProjectStatus } from "./project-status"
import { todayMidnightUTC } from "@/lib/business-days"
import type { WorkspaceTask, WorkspaceNote, WorkspaceProjectWithNotes } from "./types"

// This whole page is a private personal workspace — same visibility rule as
// the existing /todos page, not the shared read-only view deals/reminders get.

// ─── Tasks ───

export async function getWorkspaceTasks(): Promise<WorkspaceTask[]> {
  if (!(await getCanEdit())) return []
  // Tasks ticked off before today (UTC) are cleared out here rather than the
  // moment they're ticked, so unticking any time before the day rolls over
  // keeps a task safe.
  await db
    .delete(workspaceTasks)
    .where(and(eq(workspaceTasks.isCompleted, true), lt(workspaceTasks.completedAt, todayMidnightUTC())))
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
    .set({ isCompleted: completed, completedAt: completed ? new Date() : null, updatedAt: new Date() })
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

export async function getWorkspaceProjects(): Promise<WorkspaceProjectWithNotes[]> {
  if (!(await getCanEdit())) return []
  const projects = await db.select().from(workspaceProjects).orderBy(asc(workspaceProjects.createdAt))
  return Promise.all(
    projects.map(async (project) => {
      const notes = await db
        .select()
        .from(workspaceProjectNotes)
        .where(eq(workspaceProjectNotes.projectId, project.id))
        .orderBy(desc(workspaceProjectNotes.createdAt))
      return { ...project, notes }
    })
  )
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

// ─── Project notes ───

export async function addWorkspaceProjectNote(projectId: string, content: string): Promise<void> {
  if (!(await getCanEdit())) return
  const trimmed = content.trim()
  if (!trimmed) return
  await db.insert(workspaceProjectNotes).values({ id: nanoid(), projectId, content: trimmed })
  revalidatePath("/workspace")
}

export async function deleteWorkspaceProjectNote(id: string): Promise<void> {
  if (!(await getCanEdit())) return
  await db.delete(workspaceProjectNotes).where(eq(workspaceProjectNotes.id, id))
  revalidatePath("/workspace")
}
