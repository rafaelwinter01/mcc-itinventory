"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PreferenceValue } from "@/types/preference"

type SavePreferenceConfirmPayload = {
  name: string
  index: number | null
}

type SavePreferencesFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preferences: PreferenceValue[]
  maxOccurrences: number
  isSubmitting?: boolean
  onConfirm: (payload: SavePreferenceConfirmPayload) => void | Promise<void>
}

const getItemName = (item: PreferenceValue) => {
  const value = item.name
  return typeof value === "string" && value.trim() ? value : "-"
}

const getItemDate = (item: PreferenceValue) => {
  const value = item.createdAt
  if (!value) {
    return "-"
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return "-"
  }

  return parsedDate.toLocaleString()
}

export function SavePreferencesForm({
  open,
  onOpenChange,
  preferences,
  maxOccurrences,
  isSubmitting,
  onConfirm,
}: SavePreferencesFormProps) {
  const [preferenceName, setPreferenceName] = useState("")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!open) {
      setPreferenceName("")
      setSelectedIndex(null)
    }
  }, [open])

  const canSaveNew = useMemo(() => {
    return preferences.length < maxOccurrences
  }, [maxOccurrences, preferences.length])

  const isUpdateMode = selectedIndex !== null
  const confirmLabel = isUpdateMode ? "Update" : "Save"
  const disableConfirm = isSubmitting || preferenceName.trim().length === 0 || (!isUpdateMode && !canSaveNew)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-preference-name">Name</Label>
            <Input
              id="save-preference-name"
              value={preferenceName}
              onChange={(event) => setPreferenceName(event.target.value)}
            />
          </div>

          <ScrollArea className="h-56 rounded-md border">
            <div className="divide-y">
              {preferences.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No saved preferences</div>
              ) : (
                preferences.map((item, index) => {
                  const isSelected = selectedIndex === index

                  return (
                    <button
                      key={`preference-item-${index}`}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedIndex(null)
                          setPreferenceName("")
                          return
                        }

                        setSelectedIndex(index)
                        setPreferenceName(getItemName(item))
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                        isSelected ? "bg-accent" : ""
                      }`}
                    >
                      <span>{getItemName(item)}</span>
                      <span className="text-muted-foreground">{getItemDate(item)}</span>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disableConfirm}
              onClick={() => onConfirm({ name: preferenceName.trim(), index: selectedIndex })}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
