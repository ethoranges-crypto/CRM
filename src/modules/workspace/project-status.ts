export const PROJECT_STATUSES = ["not_started", "in_progress", "blocked", "done"] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  not_started: {
    label: "Not started",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In progress",
    className: "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400",
  },
  blocked: {
    label: "Blocked",
    className: "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
  },
  done: {
    label: "Done",
    className: "border-green-300 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400",
  },
}

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value)
}
