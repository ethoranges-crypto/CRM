import { db } from "./db"
import { pipelineColumns } from "@/modules/deals/schema"
import { nanoid } from "nanoid"

const defaultColumns = [
  { title: "Lead", order: 0 },
  { title: "Contacted", order: 1 },
  { title: "Negotiating", order: 2 },
  { title: "Closed Won", order: 3 },
  { title: "Closed Lost", order: 4 },
]

export async function seed() {
  const existing = await db.select().from(pipelineColumns)
  if (existing.length === 0) {
    for (const col of defaultColumns) {
      await db.insert(pipelineColumns).values({ id: nanoid(), ...col })
    }
  }
}
