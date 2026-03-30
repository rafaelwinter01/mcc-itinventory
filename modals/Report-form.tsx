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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Monitor, History, Save } from "lucide-react"
import { SavePreferencesForm } from "@/modals/SavePreferences-form"
import { PreferenceValue } from "@/types/preference"
import { ReportData, ReportField } from "@/types/report"
import { toast } from "sonner"

type ReportRow = {
  selected: boolean
  content: unknown[]
}

type ReportFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportName: string
  columnsTitle: string[]
  fields: ReportRow[]
}

type TotalFormat = "none" | "count" | "sum"

type ReportColumnItem = {
  enabled: boolean
  originalField: string
  fieldName: string
  columnWidth: string
  totalFormat: TotalFormat
}

type PreferenceBucket = {
  last?: PreferenceValue
  list: PreferenceValue[]
}

type MeResponse = {
  username?: string
}

type PreferenceResponse = {
  maxListItems?: number
  data?: PreferenceBucket
}

type SavePreferencePayload = {
  name: string
  index: number | null
  command: "new" | "last"
}

type LoadPreferenceTarget = number | "last"

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return true
  }

  const normalized = String(value).trim()
  return normalized === "" || normalized === "-"
}

const isNumericLikeValue = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value)
  }

  if (typeof value !== "string") {
    return false
  }

  const normalized = value
    .trim()
    .replace(/[$€£¥\s]/g, "")
    .replace(/,/g, "")

  if (normalized === "") {
    return false
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed)
}

const getInternalColumnWidth = (value: string) => {
  return value.trim() === "" ? "auto" : value
}

const getInputColumnWidth = (value: string | number) => {
  const normalized = String(value ?? "")
  return normalized.trim().toLowerCase() === "auto" ? "auto" : normalized
}

export function ReportForm({
  open,
  onOpenChange,
  reportName,
  columnsTitle,
  fields,
}: ReportFormProps) {
  const [reportTitle, setReportTitle] = useState("")
  const [reportSubtitle, setReportSubtitle] = useState("")
  const [onlySelected, setOnlySelected] = useState(false)
  const [generateTotals, setGenerateTotals] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingPreference, setIsSavingPreference] = useState(false)
  const [reportColumns, setReportColumns] = useState<ReportColumnItem[]>([])
  const [openSavePreferences, setOpenSavePreferences] = useState(false)
  const [savedPreferences, setSavedPreferences] = useState<PreferenceValue[]>([])
  const [maxPreferenceOccurrences, setMaxPreferenceOccurrences] = useState(0)
  const [activeUserPreference, setActiveUserPreference] = useState<PreferenceBucket | null>(null)

  const applyPreferenceContent = (data: ReportData) => {
    setReportTitle(data.title ?? "")
    setReportSubtitle(data.subtitle ?? "")
    setOnlySelected(Boolean(data.onlySelectedFields))
    setGenerateTotals(Boolean(data.generateTotals))

    const savedFieldsMap = new Map<string, ReportField>()
    data.fields.forEach((field) => {
      savedFieldsMap.set(field.originalName, field)
    })

    let mismatch = false

    setReportColumns((current) =>
      current.map((column) => {
        const savedField = savedFieldsMap.get(column.originalField)

        if (!savedField) {
          mismatch = true
          return column
        }

        return {
          ...column,
          enabled: savedField.include,
          fieldName: savedField.label,
          columnWidth: getInputColumnWidth(savedField.columnWidth),
          totalFormat: savedField.totalFormat ?? "count",
        }
      })
    )

    if (mismatch) {
      toast.warning(
        "Not all fields were found in the saved template. Please review the settings."
      )
    }
  }

  const loadPreference = (target: LoadPreferenceTarget) => {
    const preference =
      target === "last"
        ? activeUserPreference?.last
        : savedPreferences[target]

    if (!preference || !preference.content) {
      toast.error("Preference not found to load")
      return
    }

    const reportData = preference.content as ReportData
    applyPreferenceContent(reportData)
  }

  useEffect(() => {
    setReportColumns(
      columnsTitle.map((columnTitle) => ({
        enabled: true,
        originalField: columnTitle,
        fieldName: columnTitle,
        columnWidth: "",
        totalFormat: "count",
      }))
    )
  }, [columnsTitle])

  useEffect(() => {
    if (!open) {
      setOpenSavePreferences(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !reportName.trim()) {
      return
    }

    const loadActiveUserPreference = async () => {
      try {
        const meResponse = await fetch("/api/auth/me")
        if (!meResponse.ok) {
          setActiveUserPreference(null)
          setSavedPreferences([])
          setMaxPreferenceOccurrences(0)
          return
        }

        const meData = (await meResponse.json()) as MeResponse
        if (!meData.username) {
          setActiveUserPreference(null)
          setSavedPreferences([])
          setMaxPreferenceOccurrences(0)
          return
        }

        const params = new URLSearchParams({
          username: meData.username,
          key: reportName,
        })

        const preferenceResponse = await fetch(`/api/auth/me/preferences?${params.toString()}`)
        if (!preferenceResponse.ok) {
          setActiveUserPreference(null)
          setSavedPreferences([])
          setMaxPreferenceOccurrences(0)
          return
        }

        const preferenceData = (await preferenceResponse.json()) as PreferenceResponse
        const bucket = preferenceData.data ?? null
        setActiveUserPreference(bucket)
        setSavedPreferences(bucket?.list ?? [])
        setMaxPreferenceOccurrences(preferenceData.maxListItems ?? 0)
      } catch {
        setActiveUserPreference(null)
        setSavedPreferences([])
        setMaxPreferenceOccurrences(0)
      }
    }

    loadActiveUserPreference()
  }, [open, reportName])

  const numericColumns = useMemo(() => {
    return columnsTitle.map((_, index) => {
      const values = fields.map((field) => field.content[index])
      const nonEmptyValues = values.filter((value) => !isEmptyValue(value))

      if (nonEmptyValues.length === 0) {
        return false
      }

      return nonEmptyValues.every((value) => isNumericLikeValue(value))
    })
  }, [columnsTitle, fields])

  const payloadFields = useMemo(() => {
    const source = onlySelected ? fields.filter((field) => field.selected) : fields
    return source.map((field) => field.content)
  }, [fields, onlySelected])

  const apiFields = useMemo(() => {
    return reportColumns.map((column, index) => ({
      index,
      include: column.enabled,
      originalField: column.originalField,
      customTitle: column.fieldName,
      columnWidth: getInternalColumnWidth(column.columnWidth),
      totalFormat: column.totalFormat,
    }))
  }, [reportColumns])

  const getFilenameFromDisposition = (disposition: string | null) => {
    if (!disposition) return `${reportName}.pdf`

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1])
    }

    const asciiMatch = disposition.match(/filename="?([^";]+)"?/i)
    if (asciiMatch?.[1]) {
      return asciiMatch[1]
    }

    return `${reportName}.pdf`
  }

  const formatPreferenceDate = (createdAt: PreferenceValue["createdAt"]) => {
    const parsedDate = new Date(createdAt)

    if (Number.isNaN(parsedDate.getTime())) {
      return "-"
    }

    return parsedDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  const formatPreferenceName = (name: string) => {
    if (name.length <= 25) {
      return name
    }

    return `${name.slice(0, 25).trimEnd()}...`
  }

  const handleGenerate = async () => {
    setIsSubmitting(true)

    savePreference({ name: "last", index: null, command: "last" }).catch(() => {})

    try {
      const response = await fetch("/api/pdfgen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportTitle,
          reportSubtitle,
          fields: apiFields,
          rows: payloadFields,
          onlySelected,
          generateTotals,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      const blob = await response.blob()
      const filename = getFilenameFromDisposition(response.headers.get("content-disposition"))
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.href = blobUrl
      link.download = filename
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)

      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const savePreference = async ({ name, index, command }: SavePreferencePayload) => {
    const reportFields: ReportField[] = reportColumns
      .filter((column) => column.enabled)
      .map((column) => ({
        include: column.enabled,
        originalName: column.originalField,
        label: column.fieldName,
        columnWidth: getInternalColumnWidth(column.columnWidth),
        totalFormat: column.totalFormat,
      }))

    const reportData: ReportData = {
      title: reportTitle,
      subtitle: reportSubtitle,
      fields: reportFields,
      onlySelectedFields: onlySelected,
      generateTotals,
    }

    const preferenceValue: PreferenceValue = {
      name,
      createdAt: new Date(),
      content: reportData,
    }

    setIsSavingPreference(true)

    try {
      const response = await fetch("/api/auth/me/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          property: reportName,
          value: preferenceValue,
          ...(index === null ? {} : { index }),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preference")
      }

      if (command === "last") {
        setActiveUserPreference((current) => ({
          last: preferenceValue,
          list: current?.list ?? [],
        }))
      } else {
        setSavedPreferences((current) => {
          if (index !== null) {
            if (index < 0 || index >= current.length) {
              return current
            }

            return current.map((item, itemIndex) =>
              itemIndex === index ? preferenceValue : item
            )
          }

          if (maxPreferenceOccurrences <= 0) {
            return [...current, preferenceValue]
          }

          return [
            ...current.slice(-(maxPreferenceOccurrences - 1)),
            preferenceValue,
          ]
        })
      }

      setOpenSavePreferences(false)
    } finally {
      setIsSavingPreference(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-subtitle">Subtitle</Label>
            <Input
              id="report-subtitle"
              value={reportSubtitle}
              onChange={(event) => setReportSubtitle(event.target.value)}
            />
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <div className="w-full">
              <div className="grid grid-cols-[72px_160px_minmax(0,1fr)_110px_110px] gap-2 border-b px-3 py-2 text-sm font-medium">
                <div>Include</div>
                <div>Field</div>
                <div>Show Field As</div>
                <div>Column Width</div>
                <div>Total Format</div>
              </div>

              {reportColumns.map((column, index) => {
                const isNumericColumn = numericColumns[index] ?? false

                return (
                  <div
                    key={`${columnsTitle[index] ?? "field"}-${index}`}
                    className="grid grid-cols-[72px_160px_minmax(0,1fr)_110px_110px] gap-2 border-b px-3 py-2"
                  >
                    <div className="flex items-center">
                      <Checkbox
                        checked={column.enabled}
                        onCheckedChange={(checked) => {
                          setReportColumns((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, enabled: Boolean(checked) }
                                : item
                            )
                          )
                        }}
                      />
                    </div>

                    <div className="flex h-9 items-center text-sm text-secondary-foreground">
                      {column.originalField}
                    </div>

                    <Input
                      className="w-full"
                      value={column.fieldName}
                      onChange={(event) => {
                        const value = event.target.value
                        setReportColumns((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, fieldName: value }
                              : item
                          )
                        )
                      }}
                    />

                    <Input
                      className="w-full"
                      value={column.columnWidth}
                      onChange={(event) => {
                        const value = event.target.value
                        setReportColumns((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, columnWidth: value }
                              : item
                          )
                        )
                      }}
                      placeholder="auto"
                    />

                    <Select
                      value={column.totalFormat}
                      onValueChange={(value: TotalFormat) => {
                        setReportColumns((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, totalFormat: value }
                              : item
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum" disabled={!isNumericColumn}>
                          Sum
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={onlySelected}
              onCheckedChange={(checked) => setOnlySelected(Boolean(checked))}
            />
            <span className="text-sm">Only selected rows</span>
          </label>

          <label className="flex items-center gap-2">
            <Checkbox
              checked={generateTotals}
              onCheckedChange={(checked) => setGenerateTotals(Boolean(checked))}
            />
            <span className="text-sm">Generate Totals</span>
          </label>

          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-2">
              <div className="py-1 text-sm border-b border-secondary-foreground">Settings History</div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  disabled={isSubmitting || !activeUserPreference?.last}
                  variant={"outline"}
                  onClick={() => loadPreference("last")}
                >
                  <History className="h-4 w-4" />Load Last 
                </Button>
                <Select
                  disabled={savedPreferences.length === 0}
                  onValueChange={(value) => loadPreference(Number(value))}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Load Saved Report" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {savedPreferences.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        Load Saved Report
                      </SelectItem>
                    ) : (
                      savedPreferences.map((preference, index) => (
                        <SelectItem
                          className="w-full flex items-center justify-between"
                          key={`saved-report-${index}-${preference.name}`}
                          value={String(index)}
                        >
                            <div>{formatPreferenceName(preference.name)}</div>
                            <div className="text-muted-foreground">
                              {formatPreferenceDate(preference.createdAt)}
                            </div>
                       </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  variant={"outline"}
                  onClick={() => setOpenSavePreferences(true)}
                >
                  <Save className="h-4 w-4" />Save Current 
                </Button>
              </div>
            </div>
            <Button type="button" onClick={handleGenerate} disabled={isSubmitting}>
              {isSubmitting ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      <SavePreferencesForm
        open={openSavePreferences}
        onOpenChange={setOpenSavePreferences}
        preferences={savedPreferences}
        maxOccurrences={maxPreferenceOccurrences}
        isSubmitting={isSavingPreference}
        onConfirm={({ name, index }) =>
          savePreference({
            name,
            index,
            command: "new",
          })
        }
      />
    </>
  )
}
