import { getColumnsWithDeals, getLabels } from "@/modules/deals/actions"
import { KanbanBoard } from "@/modules/deals/components/kanban-board"
import { LabelManager } from "@/modules/deals/components/label-manager"
import { seed } from "@/lib/seed"

export const dynamic = "force-dynamic"

export default async function DealsPage() {
  seed()

  const [columns, allLabels] = await Promise.all([
    getColumnsWithDeals(),
    getLabels(),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Deal Pipeline</h1>
        <LabelManager initialLabels={allLabels} />
      </div>
      <KanbanBoard initialData={columns} allLabels={allLabels} />
    </div>
  )
}
