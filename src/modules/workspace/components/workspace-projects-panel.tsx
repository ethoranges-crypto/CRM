"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Trash2, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  createWorkspaceProject,
  updateWorkspaceProjectName,
  updateWorkspaceProjectStatus,
  deleteWorkspaceProject,
} from "../actions"
import { PROJECT_STATUSES, PROJECT_STATUS_CONFIG, type ProjectStatus } from "../project-status"
import type { WorkspaceProject } from "../types"

interface WorkspaceProjectsPanelProps {
  initialProjects: WorkspaceProject[]
}

export function WorkspaceProjectsPanel({ initialProjects }: WorkspaceProjectsPanelProps) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [, startTransition] = useTransition()
  const [newName, setNewName] = useState("")

  useEffect(() => setProjects(initialProjects), [initialProjects])

  function handleAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setNewName("")
    startTransition(async () => {
      await createWorkspaceProject(trimmed)
      router.refresh()
    })
  }

  function handleRename(id: string, name: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
    startTransition(async () => {
      await updateWorkspaceProjectName(id, name)
      router.refresh()
    })
  }

  function handleStatusChange(id: string, status: ProjectStatus) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
    startTransition(async () => {
      await updateWorkspaceProjectStatus(id, status)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    startTransition(async () => {
      await deleteWorkspaceProject(id)
      router.refresh()
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderKanban className="h-4 w-4" /> Project status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a project..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No projects yet — add one above.
          </p>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <WorkspaceProjectRow
                key={project.id}
                project={project}
                onRename={(name) => handleRename(project.id, name)}
                onStatusChange={(status) => handleStatusChange(project.id, status)}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkspaceProjectRow({
  project,
  onRename,
  onStatusChange,
  onDelete,
}: {
  project: WorkspaceProject
  onRename: (name: string) => void
  onStatusChange: (status: ProjectStatus) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)

  useEffect(() => setName(project.name), [project.name])

  function handleSave() {
    setEditing(false)
    const trimmed = name.trim()
    if (!trimmed || trimmed === project.name) {
      setName(project.name)
      return
    }
    onRename(trimmed)
  }

  const status = (
    project.status in PROJECT_STATUS_CONFIG ? project.status : "not_started"
  ) as ProjectStatus
  const config = PROJECT_STATUS_CONFIG[status]

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-accent/50">
      {editing ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") {
              setName(project.name)
              setEditing(false)
            }
          }}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="flex-1 cursor-text truncate text-sm"
        >
          {project.name}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity",
              config.className
            )}
          >
            {config.label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) => onStatusChange(value as ProjectStatus)}
          >
            {PROJECT_STATUSES.map((s) => (
              <DropdownMenuRadioItem key={s} value={s}>
                {PROJECT_STATUS_CONFIG[s].label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={onDelete}
        title="Delete project"
        className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
