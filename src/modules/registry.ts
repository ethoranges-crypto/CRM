import { type LucideIcon, Kanban, MessageCircle, Bell } from "lucide-react"

export interface ModuleDefinition {
  id: string
  name: string
  href: string
  icon: LucideIcon
  description: string
}

export const modules: ModuleDefinition[] = [
  {
    id: "deals",
    name: "Deal Pipeline",
    href: "/deals",
    icon: Kanban,
    description: "Track deals through your pipeline",
  },
  {
    id: "telegram",
    name: "Telegram Contacts",
    href: "/telegram",
    icon: MessageCircle,
    description: "Parse and search Telegram contacts",
  },
  {
    id: "reminders",
    name: "Reminders",
    href: "/reminders",
    icon: Bell,
    description: "View and manage deal reminders",
  },
]
