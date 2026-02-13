import type { InferSelectModel } from "drizzle-orm"
import type { tgContacts, tgGroups, tgContactGroups } from "./schema"

export type TgContact = InferSelectModel<typeof tgContacts>
export type TgGroup = InferSelectModel<typeof tgGroups>
export type TgContactGroup = InferSelectModel<typeof tgContactGroups>
