"use client"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExternalLink, Search } from "lucide-react"

interface SearchResult {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  bio: string | null
  company: string | null
  isContact: boolean
  groups: { id: string; title: string }[]
}

interface TgGroup { id: string; title: string }

interface SearchFormProps {
  groups: TgGroup[]
}

export function SearchForm({ groups }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [groupId, setGroupId] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: query })
        if (groupId) params.set("groupId", groupId)
        const res = await fetch(`/api/telegram/search?${params}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch { setResults([]) } finally { setLoading(false) }
    }, 300)
  }, [query, groupId])

  function highlightBio(bio: string | null, q: string): React.ReactNode {
    if (!bio || !q) return bio
    const idx = bio.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return bio.slice(0, 200)
    const start = Math.max(0, idx - 60)
    const end = Math.min(bio.length, idx + q.length + 100)
    const prefix = start > 0 ? "…" : ""
    const suffix = end < bio.length ? "…" : ""
    return (
      <>
        {prefix}{bio.slice(start, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{bio.slice(idx, idx + q.length)}</mark>
        {bio.slice(idx + q.length, end)}{suffix}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. AAVE, Uniswap, Ethereum Foundation…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Select value={groupId || "all"} onValueChange={v => setGroupId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}

      {!loading && query.length >= 2 && (
        <p className="text-sm text-muted-foreground">
          {results.length === 0 ? "No results found." : `${results.length} result${results.length !== 1 ? "s" : ""}`}
        </p>
      )}

      {query.length < 2 && (
        <p className="text-sm text-muted-foreground">
          Type at least 2 characters to search. Bio search only works for contacts whose bios have been indexed — use the Index Bios button on a group page.
        </p>
      )}

      <div className="space-y-3">
        {results.map(r => (
          <div key={r.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium">
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || "Unknown"}
                </span>
                {r.username && (
                  <span className="ml-2 text-sm text-muted-foreground">@{r.username}</span>
                )}
                {r.company && (
                  <Badge variant="outline" className="ml-2 text-xs">{r.company}</Badge>
                )}
              </div>
              {r.username && (
                <a href={`https://t.me/${r.username}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </a>
              )}
            </div>

            {r.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {highlightBio(r.bio, query)}
              </p>
            )}

            {r.groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.groups.map(g => (
                  <Badge key={g.id} variant="secondary" className="text-xs">{g.title}</Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
