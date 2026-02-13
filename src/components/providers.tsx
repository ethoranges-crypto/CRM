"use client"

import { ThemeProvider } from "next-themes"
import { ReminderChecker } from "@/modules/deals/components/reminder-checker"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReminderChecker />
      {children}
    </ThemeProvider>
  )
}
