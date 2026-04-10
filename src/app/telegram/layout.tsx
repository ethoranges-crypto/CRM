"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Contacts", href: "/telegram" },
  { label: "Groups", href: "/telegram/groups" },
  { label: "Search", href: "/telegram/search" },
]

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  if (pathname.startsWith("/telegram/auth")) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-4 border-b px-6">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/telegram"
              ? pathname === "/telegram"
              : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
