"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AppliedFilter = {
  name: string
  value: string
}

type ExportField = {
  key: string
  label: string
}

type UserLicenseItem = {
  userId: number
  licenseId: number
}

type ExportUserLicensesModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: UserLicenseItem[]
  listedItems: UserLicenseItem[]
  selectedFields: ExportField[]
  allFields: ExportField[]
  appliedFilters: AppliedFilter[]
  filters: {
    userId?: string
    licenseId?: string
    active?: string
    q?: string
  }
}

export function ExportUserLicensesModal({
  open,
  onOpenChange,
  selectedItems,
  listedItems,
  selectedFields,
  allFields,
  appliedFilters,
  filters,
}: ExportUserLicensesModalProps) {
  const [includesOnlySelected, setIncludesOnlySelected] = useState(
    selectedItems.length > 0
  )
  const [includesRowsNotListed, setIncludesRowsNotListed] = useState(false)
  const [chosenFields, setChosenFields] = useState<string[]>(
    selectedFields.map((field) => field.key)
  )
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(
    new Set()
  )
  const [selectedChosen, setSelectedChosen] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setChosenFields(selectedFields.map((field) => field.key))
    setSelectedAvailable(new Set())
    setSelectedChosen(new Set())
  }, [selectedFields, allFields])

  const availableFields = useMemo(
    () => allFields.filter((field) => !chosenFields.includes(field.key)),
    [allFields, chosenFields]
  )

  const handleToggleIncludesOnlySelected = (checked: boolean) => {
    setIncludesOnlySelected(checked)
    if (checked) {
      setIncludesRowsNotListed(false)
    }
  }

  const moveToChosen = () => {
    if (selectedAvailable.size === 0) return
    setChosenFields((prev) => [...prev, ...Array.from(selectedAvailable)])
    setSelectedAvailable(new Set())
  }

  const moveToAvailable = () => {
    if (selectedChosen.size === 0) return
    setChosenFields((prev) => prev.filter((field) => !selectedChosen.has(field)))
    setSelectedChosen(new Set())
  }

  const handleApply = async () => {
    const payload = {
      selectedItems,
      listedItems,
      selectedFields: chosenFields,
      allFields: allFields.map((field) => field.key),
      appliedFilters,
      includesOnlySelected,
      includesRowsNotListed,
      filters,
    }

    setIsSubmitting(true)
    const response = await fetch("/api/user-license/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename=([^;]+)/)
      const filename = filenameMatch?.[1]?.replace(/"/g, "") || "user-licenses-export.csv"

      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      onOpenChange(false)
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Export User Licenses to CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={includesOnlySelected}
                onCheckedChange={(checked) =>
                  handleToggleIncludesOnlySelected(Boolean(checked))
                }
              />
              <span className="text-sm">Includes only selected</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={includesRowsNotListed}
                onCheckedChange={(checked) =>
                  setIncludesRowsNotListed(Boolean(checked))
                }
                disabled={includesOnlySelected}
              />
              <span className="text-sm">Includes rows not listed</span>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">
              <div className="text-sm font-medium">Available Fields</div>
              <div className="h-64 overflow-auto rounded-md border p-2 space-y-1">
                {availableFields.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No fields</div>
                ) : (
                  availableFields.map((field) => (
                    <label key={field.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedAvailable.has(field.key)}
                        onCheckedChange={(checked) => {
                          setSelectedAvailable((prev) => {
                            const next = new Set(prev)
                            if (checked) {
                              next.add(field.key)
                            } else {
                              next.delete(field.key)
                            }
                            return next
                          })
                        }}
                      />
                      <span className="text-sm">{field.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <Button type="button" variant="outline" onClick={moveToChosen}>
                &gt;&gt;
              </Button>
              <Button type="button" variant="outline" onClick={moveToAvailable}>
                &lt;&lt;
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Chosen Fields</div>
              <div className="h-64 overflow-auto rounded-md border p-2 space-y-1">
                {chosenFields.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No fields</div>
                ) : (
                  chosenFields.map((fieldKey) => {
                    const field = allFields.find((item) => item.key === fieldKey)
                    return (
                      <label key={fieldKey} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedChosen.has(fieldKey)}
                          onCheckedChange={(checked) => {
                            setSelectedChosen((prev) => {
                              const next = new Set(prev)
                              if (checked) {
                                next.add(fieldKey)
                              } else {
                                next.delete(fieldKey)
                              }
                              return next
                            })
                          }}
                        />
                        <span className="text-sm">{field?.label ?? fieldKey}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={isSubmitting}>
              {isSubmitting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
