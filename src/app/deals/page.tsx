import { getColumnsWithDeals, getLabels } from "@/modules/deals/actions"
import { KanbanBoard } from "@/modules/deals/components/kanban-board"
import { LabelManager } from "@/modules/deals/components/label-manager"
import { DealSearch } from "@/modules/deals/components/deal-search"
import { seed } from "@/lib/seed"
import { getCanEdit } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function DealsPage() {
  await seed()

  const [columns, allLabels, canEdit] = await Promise.all([
    getColumnsWithDeals(),
    getLabels(),
    getCanEdit(),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <h1 className="shrink-0 text-xl font-semibold">Deal Pipeline</h1>
        <div className="flex flex-1 items-center justify-end gap-3">
          <DealSearch columns={columns} allLabels={allLabels} canEdit={canEdit} />
          {canEdit && <LabelManager initialLabels={allLabels} />}
        </div>
      </div>
      <KanbanBoard initialData={columns} allLabels={allLabels} canEdit={canEdit} />
    </div>
  )
}
