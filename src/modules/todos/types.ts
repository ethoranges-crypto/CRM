import type { InferSelectModel } from "drizzle-orm"
import type { todos } from "./schema"

export type Todo = InferSelectModel<typeof todos>
