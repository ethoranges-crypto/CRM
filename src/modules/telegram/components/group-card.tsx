import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { TgGroup } from "../types"

interface GroupCardProps {
  group: TgGroup
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/telegram/groups/${group.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            {group.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {group.memberCount ?? 0} members
            </Badge>
            <span className="text-xs text-muted-foreground">
              Synced {new Date(group.syncedAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
