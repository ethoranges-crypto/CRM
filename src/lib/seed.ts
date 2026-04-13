import { db } from "./db"
import { pipelineColumns } from "@/modules/deals/schema"
import { sql } from "drizzle-orm"
import { nanoid } from "nanoid"

const defaultColumns = [
  { title: "Lead", order: 0 },
  { title: "Contacted", order: 1 },
  { title: "Negotiating", order: 2 },
  { title: "Closed Won", order: 3 },
  { title: "Closed Lost", order: 4 },
]

export async function seed() {
  // Schema migrations — safe no-ops if column already exists
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN action_taken_at INTEGER`)
  } catch { /* column already exists */ }
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN action_note TEXT`)
  } catch { /* column already exists */ }

  const existing = await db.select().from(pipelineColumns)
  if (existing.length === 0) {
    for (const col of defaultColumns) {
      await db.insert(pipelineColumns).values({ id: nanoid(), ...col })
    }
  }
}
