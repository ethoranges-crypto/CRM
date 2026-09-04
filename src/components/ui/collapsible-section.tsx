import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  headingClassName?: string
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  headingClassName,
  children,
}: CollapsibleSectionProps) {
  return (
    <details className="group" open={defaultOpen}>
      <summary
        className={cn(
          "mb-3 flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold [&::-webkit-details-marker]:hidden",
          headingClassName
        )}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        {title} ({count})
      </summary>
      <div className="space-y-2 pl-5">{children}</div>
    </details>
  )
}
