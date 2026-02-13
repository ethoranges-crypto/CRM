"use client"

import { useState } from "react"
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
import { Trash2, Plus, X, Bell } from "lucide-react"
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealCardDialog({
  deal,
  allLabels,
  open,
  onOpenChange,
}: DealCardDialogProps) {
  const [alias, setAlias] = useState(deal.alias)
  const [company, setCompany] = useState(deal.company || "")
  const [tgHandle, setTgHandle] = useState(deal.telegramHandle || "")
  const [noteText, setNoteText] = useState("")
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldValue, setNewFieldValue] = useState("")
  const [reminderNote, setReminderNote] = useState("")
  const [reminderDate, setReminderDate] = useState("")
  const [reminderTime, setReminderTime] = useState("")

  async function handleSave() {
    await updateDeal(deal.id, {
      alias: alias || deal.alias,
      company: company || undefined,
      telegramHandle: tgHandle || undefined,
    })
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    await addNote(deal.id, noteText.trim())
    setNoteText("")
  }

  async function handleAddCustomField() {
    if (!newFieldName.trim() || !newFieldValue.trim()) return
    await addCustomField(deal.id, newFieldName.trim(), newFieldValue.trim())
    setNewFieldName("")
    setNewFieldValue("")
  }

  async function handleDelete() {
    await deleteDeal(deal.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        {/* Editable core fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Alias / Name
            </label>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              onBlur={handleSave}
              placeholder="Partner alias"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Company
            </label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={handleSave}
              placeholder="Company"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Telegram Handle
            </label>
            <Input
              value={tgHandle}
              onChange={(e) => setTgHandle(e.target.value)}
              onBlur={handleSave}
              placeholder="@handle"
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
          <LabelPicker
            dealId={deal.id}
            allLabels={allLabels}
            assignedLabelIds={deal.labels.map((l) => l.id)}
          />
        </div>

        <Separator />

        {/* Custom fields */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Custom Fields</h4>
          {deal.customFields.map((field) => (
            <CustomFieldRow key={field.id} field={field} />
          ))}
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
              disabled={!newFieldName.trim() || !newFieldValue.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
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
              <ReminderRow key={reminder.id} reminder={reminder} />
            ))}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-28"
              />
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
                onClick={async () => {
                  if (!reminderDate || !reminderNote.trim()) return
                  const dateStr = reminderTime
                    ? `${reminderDate}T${reminderTime}`
                    : `${reminderDate}T09:00`
                  await addReminder(
                    deal.id,
                    reminderNote.trim(),
                    new Date(dateStr)
                  )
                  setReminderNote("")
                  setReminderDate("")
                  setReminderTime("")
                }}
                disabled={!reminderDate || !reminderNote.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                onClick={() => deleteNote(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="min-h-[60px]"
          />
          <div className="flex justify-between">
            <Button onClick={handleAddNote} size="sm">
              Add Note
            </Button>
            <Button onClick={handleDelete} variant="destructive" size="sm">
              <Trash2 className="mr-1 h-3 w-3" /> Delete Deal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Custom Field Row (inline editable) ───

function CustomFieldRow({
  field,
}: {
  field: { id: string; fieldName: string; fieldValue: string }
}) {
  const [name, setName] = useState(field.fieldName)
  const [value, setValue] = useState(field.fieldValue)

  async function handleSave() {
    if (name !== field.fieldName || value !== field.fieldValue) {
      await updateCustomField(field.id, { fieldName: name, fieldValue: value })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleSave}
        className="flex-1 text-xs"
        placeholder="Field name"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        className="flex-1 text-xs"
        placeholder="Value"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0"
        onClick={() => deleteCustomField(field.id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
