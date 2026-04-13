"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, X, Bell } from "lucide-react"

// 08:00–19:00 in 30-min increments
const REMINDER_TIMES = Array.from({ length: 23 }, (_, i) => {
  const totalMins = 8 * 60 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
})
import {
  addNote,
  deleteDeal,
  deleteNote,
  updateDeal,
  addCustomField,
  updateCustomField,
  deleteCustomField,
  addReminder,
} from "../actions"
import { LabelPicker } from "./label-picker"
import { ReminderRow } from "./reminder-row"
import type { DealWithNotes, Label } from "../types"

interface DealCardDialogProps {
  deal: DealWithNotes
  allLabels: Label[]
  canEdit: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealCardDialog({
  deal,
  allLabels,
  canEdit,
  open,
  onOpenChange,
}: DealCardDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [alias, setAlias] = useState(deal.alias)
  const [company, setCompany] = useState(deal.company || "")
  const [tgHandle, setTgHandle] = useState(deal.telegramHandle || "")
  const [noteText, setNoteText] = useState("")
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldValue, setNewFieldValue] = useState("")
  const [reminderNote, setReminderNote] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [reminderTime, setReminderTime] = useState("")

  function handleSave() {
    if (!canEdit) return
    startTransition(async () => {
      try {
        await updateDeal(deal.id, {
          alias: alias || deal.alias,
          company: company || undefined,
          telegramHandle: tgHandle || undefined,
        })
        router.refresh()
      } catch (err) {
        console.error("Save deal error:", err)
      }
    })
  }

  function handleAddNote() {
    if (!noteText.trim() || !canEdit) return
    startTransition(async () => {
      try {
        await addNote(deal.id, noteText.trim())
        setNoteText("")
        router.refresh()
      } catch (err) {
        console.error("Add note error:", err)
      }
    })
  }

  function handleAddCustomField() {
    if (!newFieldName.trim() || !newFieldValue.trim() || !canEdit) return
    startTransition(async () => {
      try {
        await addCustomField(deal.id, newFieldName.trim(), newFieldValue.trim())
        setNewFieldName("")
        setNewFieldValue("")
        router.refresh()
      } catch (err) {
        console.error("Add custom field error:", err)
      }
    })
  }

  function handleDelete() {
    if (!canEdit) return
    startTransition(async () => {
      try {
        await deleteDeal(deal.id)
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        console.error("Delete deal error:", err)
      }
    })
  }

  function handleAddReminder() {
    if (!reminderDate || !reminderNote.trim() || !canEdit) return
    startTransition(async () => {
      try {
        const dateStr = reminderTime
          ? `${reminderDate}T${reminderTime}`
          : `${reminderDate}T09:00`
        await addReminder(deal.id, reminderNote.trim(), new Date(dateStr))
        setReminderNote("")
        setReminderDate("")
        setReminderTime("")
        router.refresh()
      } catch (err) {
        console.error("Add reminder error:", err)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{canEdit ? "Edit Deal" : "View Deal"}</DialogTitle>
        </DialogHeader>

        {/* Core fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Alias / Name
            </label>
            <Input
              value={alias}
              onChange={(e) => canEdit && setAlias(e.target.value)}
              onBlur={canEdit ? handleSave : undefined}
              placeholder="Partner alias"
              readOnly={!canEdit}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Company
            </label>
            <Input
              value={company}
              onChange={(e) => canEdit && setCompany(e.target.value)}
              onBlur={canEdit ? handleSave : undefined}
              placeholder="Company"
              readOnly={!canEdit}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Telegram Handle
            </label>
            <Input
              value={tgHandle}
              onChange={(e) => canEdit && setTgHandle(e.target.value)}
              onBlur={canEdit ? handleSave : undefined}
              placeholder="@handle"
              readOnly={!canEdit}
            />
          </div>
        </div>

        <Separator />

        {/* Labels */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Labels</h4>
          <div className="flex flex-wrap gap-1.5">
            {deal.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
          {canEdit && (
            <LabelPicker
              dealId={deal.id}
              allLabels={allLabels}
              assignedLabelIds={deal.labels.map((l) => l.id)}
            />
          )}
        </div>

        <Separator />

        {/* Custom fields */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Custom Fields</h4>
          {deal.customFields.map((field) => (
            <CustomFieldRow key={field.id} field={field} canEdit={canEdit} />
          ))}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Input
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Field name"
                className="flex-1"
              />
              <Input
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                placeholder="Value"
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCustomField}
                disabled={
                  !newFieldName.trim() || !newFieldValue.trim() || isPending
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Reminders */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium">
            <Bell className="h-3.5 w-3.5" /> Reminders
          </h4>
          {deal.reminders.filter((r) => r.status !== "done").length === 0 && (
            <p className="text-xs text-muted-foreground">No reminders set.</p>
          )}
          {deal.reminders
            .filter((r) => r.status !== "done")
            .map((reminder) => (
              <ReminderRow key={reminder.id} reminder={reminder} canEdit={canEdit} />
            ))}
          {canEdit && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="flex-1"
                />
                <Select value={reminderTime} onValueChange={setReminderTime}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_TIMES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Reminder note..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddReminder}
                  disabled={!reminderDate || !reminderNote.trim() || isPending}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Notes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Notes</h4>
          {deal.notes.length === 0 && (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          )}
          {deal.notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-start justify-between rounded bg-muted p-2 text-sm"
            >
              <div>
                {note.content}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        await deleteNote(note.id)
                        router.refresh()
                      } catch (err) {
                        console.error("Delete note error:", err)
                      }
                    })
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[60px]"
              />
              <div className="flex justify-between">
                <Button onClick={handleAddNote} size="sm" disabled={isPending}>
                  Add Note
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Delete Deal
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Custom Field Row ───

function CustomFieldRow({
  field,
  canEdit,
}: {
  field: { id: string; fieldName: string; fieldValue: string }
  canEdit: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(field.fieldName)
  const [value, setValue] = useState(field.fieldValue)

  function handleSave() {
    if (!canEdit) return
    if (name !== field.fieldName || value !== field.fieldValue) {
      startTransition(async () => {
        try {
          await updateCustomField(field.id, {
            fieldName: name,
            fieldValue: value,
          })
          router.refresh()
        } catch (err) {
          console.error("Update custom field error:", err)
        }
      })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => canEdit && setName(e.target.value)}
        onBlur={canEdit ? handleSave : undefined}
        className="flex-1 text-xs"
        placeholder="Field name"
        readOnly={!canEdit}
      />
      <Input
        value={value}
        onChange={(e) => canEdit && setValue(e.target.value)}
        onBlur={canEdit ? handleSave : undefined}
        className="flex-1 text-xs"
        placeholder="Value"
        readOnly={!canEdit}
      />
      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              try {
                await deleteCustomField(field.id)
                router.refresh()
              } catch (err) {
                console.error("Delete custom field error:", err)
              }
            })
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
