import type { InferSelectModel } from "drizzle-orm"
import type {
  deals,
  pipelineColumns,
  dealNotes,
  dealCustomFields,
  labels,
  dealLabels,
  dealReminders,
} from "./schema"

export type Deal = InferSelectModel<typeof deals>
export type PipelineColumn = InferSelectModel<typeof pipelineColumns>
export type DealNote = InferSelectModel<typeof dealNotes>
export type DealCustomField = InferSelectModel<typeof dealCustomFields>
export type Label = InferSelectModel<typeof labels>
export type DealLabel = InferSelectModel<typeof dealLabels>
export type DealReminder = InferSelectModel<typeof dealReminders>

export type DealWithNotes = Deal & {
  notes: DealNote[]
  customFields: DealCustomField[]
  labels: Label[]
  reminders: DealReminder[]
}

export type ColumnWithDeals = PipelineColumn & { deals: DealWithNotes[] }
