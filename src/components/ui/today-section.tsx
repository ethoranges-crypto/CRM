import { cn } from "@/lib/utils"

interface TodaySectionProps {
  title: string
  count: number
  className?: string
  children: React.ReactNode
}

// Shared wrapper for the Today dashboard's repeated "heading + count + list"
// sections, so the page itself only carries the filtering/sorting logic.
export function TodaySection({ title, count, className, children }: TodaySectionProps) {
  return (
    <section>
      <h2 className={cn("mb-3 text-sm font-semibold", className)}>
        {title} ({count})
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
