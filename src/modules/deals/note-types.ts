export const NOTE_TYPES = ["note", "call", "email", "meeting"] as const

export type NoteType = (typeof NOTE_TYPES)[number]

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: "Note",
  call: "Call",
  email: "Email",
  meeting: "Meeting",
}

export function isNoteType(value: string): value is NoteType {
  return (NOTE_TYPES as readonly string[]).includes(value)
}
