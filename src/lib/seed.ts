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
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN next_action TEXT`)
  } catch { /* column already exists */ }
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN next_action_date INTEGER`)
  } catch { /* column already exists */ }
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN last_contacted_at INTEGER`)
  } catch { /* column already exists */ }
  try {
    await db.run(sql`ALTER TABLE deals ADD COLUMN snooze_until INTEGER`)
  } catch { /* column already exists */ }

  // Column "outcome" (open | won | lost) drives which deals count as
  // "active" for the Today dashboard.
  try {
    await db.run(sql`ALTER TABLE pipeline_columns ADD COLUMN outcome TEXT NOT NULL DEFAULT 'open'`)
  } catch { /* column already exists */ }

  // Todos table
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      is_urgent INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completed_at INTEGER,
      scheduled_for INTEGER,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  const existing = await db.select().from(pipelineColumns)
  if (existing.length === 0) {
    for (const col of defaultColumns) {
      await db.insert(pipelineColumns).values({ id: nanoid(), ...col })
    }
  }

  // Best-guess columns still at the default "open" outcome by title. Runs on
  // every call but only ever touches rows currently at the default, so a
  // manual override via the column menu (which sets a non-default outcome,
  // or explicitly re-picks "Open") always sticks. This can't be gated to
  // "run once" the way the other migrations are: drizzle-kit push (part of
  // `npm run build`) adds the outcome column ahead of seed() ever running,
  // so seed()'s own ALTER TABLE always finds it already present — there's
  // no reliable "just added" signal to key off. The one edge case this
  // doesn't handle: a column deliberately titled with "won"/"lost" in it
  // that you want treated as open will keep getting reclassified.
  await db.run(sql`UPDATE pipeline_columns SET outcome = 'won' WHERE outcome = 'open' AND lower(title) LIKE '%won%'`)
  await db.run(sql`UPDATE pipeline_columns SET outcome = 'lost' WHERE outcome = 'open' AND lower(title) LIKE '%lost%'`)
}
