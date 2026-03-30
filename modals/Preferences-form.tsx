"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CARD_MODEL_KEYS } from "@/constants/preferences"
import { DEVICE_PAGE_MODEL_KEYS } from "@/constants/preferences"
import { usePreferencesStore } from "@/stores/preferences-store"
import { toast } from "sonner"

type PreferencesFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesForm({ open, onOpenChange }: PreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCardModel, setSelectedCardModel] = useState<CARD_MODEL_KEYS>(CARD_MODEL_KEYS.DEFAULT)
  const [selectedDevicePageModel, setSelectedDevicePageModel] = useState<DEVICE_PAGE_MODEL_KEYS>(
    DEVICE_PAGE_MODEL_KEYS.DEFAULT
  )
  const cardModel = usePreferencesStore((state) => state.cardModel)
  const devicePageModel = usePreferencesStore((state) => state.devicePageModel)
  const isSaving = usePreferencesStore((state) => state.isSaving)
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences)
  const saveCardModel = usePreferencesStore((state) => state.saveCardModel)
  const saveDevicePageModel = usePreferencesStore((state) => state.saveDevicePageModel)

  useEffect(() => {
    setSelectedCardModel(cardModel)
  }, [cardModel])

  useEffect(() => {
    setSelectedDevicePageModel(devicePageModel)
  }, [devicePageModel])

  useEffect(() => {
    if (!open) {
      return
    }

    let isMounted = true

    const load = async () => {
      setIsLoading(true)

      try {
        await loadPreferences(true)

        if (isMounted) {
          setSelectedCardModel(usePreferencesStore.getState().cardModel)
          setSelectedDevicePageModel(usePreferencesStore.getState().devicePageModel)
        }
      } catch {
        toast.error("Unable to load preferences")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [open, loadPreferences])

  const modelOptions = useMemo(
    () => [
      { value: CARD_MODEL_KEYS.DEFAULT, label: "Default" },
      { value: CARD_MODEL_KEYS.CLASSIC, label: "Classic" },
      { value: CARD_MODEL_KEYS.COMPACT, label: "Compact" },
    ],
    []
  )

  const handleSave = async () => {
    try {
      await saveCardModel(selectedCardModel)
      await saveDevicePageModel(selectedDevicePageModel)

      toast.success("Preferences saved")
      onOpenChange(false)
    } catch {
      toast.error("Unable to save preferences")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-model">Card model</Label>
            <Select
              value={selectedCardModel}
              onValueChange={(value) => setSelectedCardModel(value as CARD_MODEL_KEYS)}
              disabled={isLoading || isSaving}
            >
              <SelectTrigger id="card-model">
                <SelectValue placeholder="Select card model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-page-model">Device page model</Label>
            <Select
              value={selectedDevicePageModel}
              onValueChange={(value) => setSelectedDevicePageModel(value as DEVICE_PAGE_MODEL_KEYS)}
              disabled={isLoading || isSaving}
            >
              <SelectTrigger id="device-page-model">
                <SelectValue placeholder="Select device page model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEVICE_PAGE_MODEL_KEYS.DEFAULT}>Default</SelectItem>
                <SelectItem value={DEVICE_PAGE_MODEL_KEYS.COMPACT}>Compact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
