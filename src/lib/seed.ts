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

export function seed() {
  const existing = db.select().from(pipelineColumns).all()
  if (existing.length === 0) {
    for (const col of defaultColumns) {
      db.insert(pipelineColumns)
        .values({ id: nanoid(), ...col })
        .run()
    }
  }
}
