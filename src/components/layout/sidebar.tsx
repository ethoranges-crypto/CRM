"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { modules } from "@/modules/registry"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useReminderCountStore } from "@/modules/deals/reminder-store"

export function Sidebar() {
  const pathname = usePathname()
  const dueCount = useReminderCountStore((s) => s.dueCount)

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">CRM</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {modules.map((mod) => (
          <Link
            key={mod.id}
            href={mod.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname.startsWith(mod.href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <mod.icon className="h-4 w-4" />
            {mod.name}
            {mod.id === "reminders" && dueCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-xs"
              >
                {dueCount}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-2">
        <Separator className="mb-2" />
        <ThemeToggle />
      </div>
    </aside>
  )
}
