import { SearchForm } from "@/modules/telegram/components/search-form"
import { getGroups } from "@/modules/telegram/actions"

export const dynamic = "force-dynamic"

export default async function SearchPage() {
  const groups = await getGroups()
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Search Telegram</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across indexed contacts by bio keyword, name, or username.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <SearchForm groups={groups} />
      </div>
    </div>
  )
}
