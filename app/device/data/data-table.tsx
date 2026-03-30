"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ArrowUpDown,
  ChevronDown,
  FileDown,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MultiEditDeviceForm,
  type MultiEditColumn,
  type MultiEditOption,
} from "@/modals/MultiEditDevice-form"
import { ExportDevicesModal } from "@/modals/ExportDevices-Modal"
import { ReportForm } from "@/modals/Report-form"
import { SavePreferencesForm } from "@/modals/SavePreferences-form"
import {
  DEVICE_BULK_EDIT_SCHEMA,
} from "@/lib/device-bulk-edit-schema"
import {
  DEVICE_DATA_SELECTED_COLUMNS,
  DEVICE_REPORT_DATA,
} from "@/constants/preferences"
import { PreferenceValue } from "@/types/preference"
import { DataSettingsMenu } from "@/components/Data-settings-menu"
import { toast } from "sonner"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  appliedFilters: Array<{ name: string; value: string }>
}

type NumberRangeFilterValue = {
  min?: string
  max?: string
}

type DateRangeFilterValue = {
  from?: string
  to?: string
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
  visibleColumnIds?: string[]
}

type LoadPreferenceTarget = number | "last"

type SelectedColumnsPreferenceContent = {
  visibleColumnIds?: string[]
}

const DATE_COLUMN_IDS = new Set<string>([
  "warrantyStart",
  "warrantyEnd",
  "lifecycle.purchaseDate",
  "lifecycle.endOfLife",
  "createdAt",
  "updatedAt",
])

const COLUMN_INPUT_TYPE = DEVICE_BULK_EDIT_SCHEMA.reduce<Record<string, "text" | "number" | "date">>(
  (acc, field) => {
    if (field.type === "number" || field.type === "date") {
      acc[field.columnId] = field.type
      return acc
    }

    acc[field.columnId] = "text"
    return acc
  },
  {}
)

const getFilterInputType = (columnId: string): "text" | "number" | "date" => {
  if (DATE_COLUMN_IDS.has(columnId)) {
    return "date"
  }

  return COLUMN_INPUT_TYPE[columnId] ?? "text"
}

const numberRangeFilter: FilterFn<unknown> = (row, columnId, value) => {
  const filterValue = (value ?? {}) as NumberRangeFilterValue
  const min = filterValue.min ? Number(filterValue.min) : null
  const max = filterValue.max ? Number(filterValue.max) : null

  if (min === null && max === null) {
    return true
  }

  const rowValue = Number(row.getValue(columnId))
  if (!Number.isFinite(rowValue)) {
    return false
  }

  if (min !== null && rowValue < min) {
    return false
  }

  if (max !== null && rowValue > max) {
    return false
  }

  return true
}

const dateRangeFilter: FilterFn<unknown> = (row, columnId, value) => {
  const filterValue = (value ?? {}) as DateRangeFilterValue
  const from = filterValue.from ? new Date(filterValue.from) : null
  const to = filterValue.to ? new Date(`${filterValue.to}T23:59:59.999`) : null

  if (!from && !to) {
    return true
  }

  const raw = row.getValue(columnId)
  if (!raw) {
    return false
  }

  const rowDate = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(rowDate.getTime())) {
    return false
  }

  if (from && rowDate < from) {
    return false
  }

  if (to && rowDate > to) {
    return false
  }

  return true
}

export function DataTable<TData, TValue>({
  columns,
  data,
  appliedFilters,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const [isReportOpen, setIsReportOpen] = React.useState(false)
  const [isSavingPreference, setIsSavingPreference] = React.useState(false)
  const [openSavePreferences, setOpenSavePreferences] = React.useState(false)
  const [savedPreferences, setSavedPreferences] = React.useState<PreferenceValue[]>([])
  const [maxPreferenceOccurrences, setMaxPreferenceOccurrences] = React.useState(0)
  const [activeUserPreference, setActiveUserPreference] = React.useState<PreferenceBucket | null>(null)

  const columnsWithSelection = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    const selectionColumn: ColumnDef<TData, TValue> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }

    const typedColumns = columns.map((column) => {
      const columnRecord = column as unknown as Record<string, unknown>
      const accessorKey =
        typeof columnRecord.accessorKey === "string"
          ? columnRecord.accessorKey
          : ""

      const columnId =
        (typeof column.id === "string" && column.id) ||
        accessorKey

      const filterType = getFilterInputType(columnId)

      if (filterType === "number") {
        return {
          ...column,
          filterFn: numberRangeFilter as FilterFn<TData>,
        } as ColumnDef<TData, TValue>
      }

      if (filterType === "date") {
        return {
          ...column,
          filterFn: dateRangeFilter as FilterFn<TData>,
        } as ColumnDef<TData, TValue>
      }

      return column as ColumnDef<TData, TValue>
    }) as ColumnDef<TData, TValue>[]

    return [selectionColumn, ...typedColumns]
  }, [columns])

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    filterFns: {
      numberRange: numberRangeFilter,
      dateRange: dateRangeFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 50, // Default to 50 rows per page
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const buildVisibleColumnIdsFromState = React.useCallback(
    (nextVisibility?: VisibilityState) => {
      return table
        .getAllColumns()
        .filter((column) => column.id !== "select")
        .filter((column) => {
          if (!nextVisibility) {
            return column.getIsVisible()
          }

          const visibilityValue = nextVisibility[column.id]
          return visibilityValue !== false
        })
        .map((column) => column.id)
    },
    [table]
  )

  const saveColumnPreference = React.useCallback(
    async ({ name, index, command, visibleColumnIds }: SavePreferencePayload) => {
      const content: SelectedColumnsPreferenceContent = {
        visibleColumnIds: visibleColumnIds ?? buildVisibleColumnIdsFromState(),
      }

      const preferenceValue: PreferenceValue = {
        name,
        createdAt: new Date(),
        content,
      }

      if (command === "new") {
        setIsSavingPreference(true)
      }

      try {
        const response = await fetch("/api/auth/me/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            command,
            property: DEVICE_DATA_SELECTED_COLUMNS,
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
            list: current?.list ?? savedPreferences,
          }))
          return
        }

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

        setOpenSavePreferences(false)
      } catch {
        if (command === "new") {
          toast.error("Failed to save selected columns")
        }
      } finally {
        if (command === "new") {
          setIsSavingPreference(false)
        }
      }
    },
    [
      buildVisibleColumnIdsFromState,
      maxPreferenceOccurrences,
      savedPreferences,
    ]
  )

  const applySelectedColumnsPreference = React.useCallback(
    (content: SelectedColumnsPreferenceContent) => {
      const allColumns = table
        .getAllColumns()
        .filter((column) => column.id !== "select")

      const savedIds = new Set(content.visibleColumnIds ?? [])
      const nextVisibility: VisibilityState = {}

      allColumns.forEach((column) => {
        nextVisibility[column.id] = savedIds.has(column.id)
      })

      table.setColumnVisibility(nextVisibility)
    },
    [table]
  )

  const loadColumnPreference = React.useCallback(
    (target: LoadPreferenceTarget) => {
      const preference =
        target === "last"
          ? activeUserPreference?.last
          : savedPreferences[target]

      if (!preference?.content) {
        toast.error("Preference not found to load")
        return
      }

      applySelectedColumnsPreference(preference.content as SelectedColumnsPreferenceContent)
    },
    [activeUserPreference?.last, applySelectedColumnsPreference, savedPreferences]
  )

  React.useEffect(() => {
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
          key: DEVICE_DATA_SELECTED_COLUMNS,
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

        if (bucket?.last?.content) {
          applySelectedColumnsPreference(bucket.last.content as SelectedColumnsPreferenceContent)
        }
      } catch {
        setActiveUserPreference(null)
        setSavedPreferences([])
        setMaxPreferenceOccurrences(0)
      }
    }

    loadActiveUserPreference()
  }, [applySelectedColumnsPreference])

  const handleColumnVisibilityChange = React.useCallback(
    (columnId: string, checked: boolean) => {
      const currentVisibility = table.getState().columnVisibility
      const nextVisibility: VisibilityState = {
        ...currentVisibility,
        [columnId]: checked,
      }

      const visibleColumnIds = buildVisibleColumnIdsFromState(nextVisibility)
      table.setColumnVisibility(nextVisibility)

      saveColumnPreference({
        name: "last",
        index: null,
        command: "last",
        visibleColumnIds,
      }).catch(() => {})
    },
    [buildVisibleColumnIdsFromState, saveColumnPreference, table]
  )

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const appliesLabel = selectedCount > 0 ? `Selected (${selectedCount})` : "None"
  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => (row.original as { id: number }).id)
    .filter((id): id is number => typeof id === "number")

  const fetchOptions = React.useCallback(
    async (url: string, map: (item: any) => MultiEditOption): Promise<MultiEditOption[]> => {
      const response = await fetch(url)
      if (!response.ok) return []
      const payload = await response.json()
      const items = Array.isArray(payload) ? payload : payload?.data ?? []
      return items.map(map)
    },
    []
  )

  const optionLoaders = React.useMemo<Record<string, () => Promise<MultiEditOption[]>>>(
    () => ({
      deviceTypeId: () =>
        fetchOptions("/api/devicetype", (item) => ({
          value: String(item.id),
          label: item.name ?? "Unknown",
        })),
      statusId: () =>
        fetchOptions("/api/status", (item) => ({
          value: String(item.id),
          label: item.name ?? "Unknown",
        })),
      locationId: () =>
        fetchOptions("/api/location", (item) => ({
          value: String(item.id),
          label: item.name ?? "Unknown",
        })),
      billedTo: () =>
        fetchOptions("/api/department", (item) => ({
          value: String(item.id),
          label: item.name ?? "Unknown",
        })),
      costTo: () =>
        fetchOptions("/api/department", (item) => ({
          value: String(item.id),
          label: item.name ?? "Unknown",
        })),
      makeModelId: () =>
        fetchOptions("/api/makemodel", (item) => ({
          value: String(item.id),
          label: `${item.make ?? ""} ${item.model ?? ""}`.trim() || "Unknown",
        })),
      assignedUserId: () =>
        fetchOptions("/api/user", (item) => ({
          value: String(item.id),
          label: item.email ? `${item.firstname ?? ""} ${item.lastname ?? ""}`.trim() + ` (${item.email})` : `${item.firstname ?? ""} ${item.lastname ?? ""}`.trim() || "Unknown",
        })),
    }),
    [fetchOptions]
  )

  const multiEditColumns = React.useMemo<MultiEditColumn[]>(() => {
    const visibleColumnIds = new Set(
      table
        .getAllColumns()
        .filter((column) => column.getIsVisible() && column.id !== "select")
        .map((column) => column.id)
    )

    return DEVICE_BULK_EDIT_SCHEMA
      .filter((field) => visibleColumnIds.has(field.columnId))
      .map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        isForeignKey: field.isForeignKey,
        options: undefined,
      }))
  }, [table, columnVisibility])

  const reportColumnsTitle = React.useMemo(() => {
    return table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== "select")
      .map((column) => {
        const header = column.columnDef.header
        return typeof header === "string" ? header : column.id
      })
  }, [table, columnVisibility])

  const reportFields = React.useMemo(() => {
    const visibleColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== "select")

    return table.getFilteredRowModel().rows.map((row) => ({
      selected: row.getIsSelected(),
      content: visibleColumns.map((column) => {
        const value = row.getValue(column.id)

        if (value === null || value === undefined || value === "") {
          return "-"
        }

        if (value instanceof Date) {
          return value.toLocaleDateString("en-US")
        }

        return String(value)
      }),
    }))
  }, [table, columnVisibility, rowSelection, columnFilters, sorting, data])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-card/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Applies to:</span>
            <span className="text-xs font-medium">{appliesLabel}</span>
          </div>
          {/* {appliedFilters.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Filters: {appliedFilters.map((filter) => `${filter.name}=${filter.value}`).join(" · ")}
            </div>
          )} */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditOpen(true)}
              disabled={selectedIds.length === 0}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsDeleteOpen(true)}
              disabled={selectedIds.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsExportOpen(true)}
            >
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsReportOpen(true)}
            >
              <Printer className="h-4 w-4" />
              Report
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        handleColumnVisibilityChange(column.id, Boolean(value))
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DataSettingsMenu
            hasLastPreference={Boolean(activeUserPreference?.last)}
            savedPreferences={savedPreferences}
            onLoadLast={() => loadColumnPreference("last")}
            onLoadSaved={(index) => loadColumnPreference(index)}
            onSaveCurrent={() => setOpenSavePreferences(true)}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                          className="h-auto p-0 font-medium hover:bg-transparent"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
            <TableRow>
              {table.getHeaderGroups().slice(-1)[0].headers.map((header) => (
                <TableHead key={`${header.id}-filter`}>
                  {header.column.id === "select" || !header.column.getCanFilter()
                    ? null
                    : (() => {
                        const filterType = getFilterInputType(header.column.id)

                        if (filterType === "number") {
                          const value = (header.column.getFilterValue() as NumberRangeFilterValue | undefined) ?? {}
                          const isCostColumn = header.column.id === "cost"
                          const numberInputClassName = isCostColumn
                            ? "h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            : "h-8"
                          return (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                value={value.min ?? ""}
                                onChange={(event) => {
                                  const next = { ...value, min: event.target.value }
                                  const hasValue = Boolean(next.min || next.max)
                                  header.column.setFilterValue(hasValue ? next : undefined)
                                }}
                                placeholder="Min"
                                className={numberInputClassName}
                              />
                              <Input
                                type="number"
                                value={value.max ?? ""}
                                onChange={(event) => {
                                  const next = { ...value, max: event.target.value }
                                  const hasValue = Boolean(next.min || next.max)
                                  header.column.setFilterValue(hasValue ? next : undefined)
                                }}
                                placeholder="Max"
                                className={numberInputClassName}
                              />
                            </div>
                          )
                        }

                        if (filterType === "date") {
                          const value = (header.column.getFilterValue() as DateRangeFilterValue | undefined) ?? {}
                          return (
                            <div className="flex gap-1">
                              <Input
                                type="date"
                                value={value.from ?? ""}
                                onChange={(event) => {
                                  const next = { ...value, from: event.target.value }
                                  const hasValue = Boolean(next.from || next.to)
                                  header.column.setFilterValue(hasValue ? next : undefined)
                                }}
                                className="h-8 w-24"
                              />
                              <Input
                                type="date"
                                value={value.to ?? ""}
                                onChange={(event) => {
                                  const next = { ...value, to: event.target.value }
                                  const hasValue = Boolean(next.from || next.to)
                                  header.column.setFilterValue(hasValue ? next : undefined)
                                }}
                                className="h-8 w-24"
                              />
                            </div>
                          )
                        }

                        return (
                          <Input
                            value={(header.column.getFilterValue() as string) ?? ""}
                            onChange={(event) => header.column.setFilterValue(event.target.value)}
                            placeholder="Filter..."
                            className="h-8"
                          />
                        )
                      })()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="even:bg-muted/20 hover:bg-muted/75"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsWithSelection.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-17.5">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </p>
          </div>
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk edit devices</DialogTitle>
          </DialogHeader>
          <MultiEditDeviceForm
            columns={multiEditColumns}
            selectedIds={selectedIds}
            optionLoaders={optionLoaders}
            onCancel={() => setIsEditOpen(false)}
            onUpdated={() => {
              setIsEditOpen(false)
              router.refresh()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            You are about to delete {selectedIds.length} device(s). This action
            cannot be undone.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isDeleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || selectedIds.length === 0}
              onClick={async () => {
                if (selectedIds.length === 0) return
                setIsDeleting(true)
                const response = await fetch("/api/device/bulk", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: selectedIds }),
                })
                setIsDeleting(false)
                if (response.ok) {
                  setIsDeleteOpen(false)
                  router.refresh()
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportDevicesModal
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        selectedIds={selectedIds}
        allIds={data.map((row) => (row as { id: number }).id).filter((id) => typeof id === "number")}
        selectedFields={multiEditColumns.map((column) => ({
          key: column.key,
          label: column.label,
        }))}
        allFields={DEVICE_BULK_EDIT_SCHEMA.map((field) => ({
          key: field.key,
          label: field.label,
        }))}
        appliedFilters={appliedFilters}
      />

      <ReportForm
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        reportName={DEVICE_REPORT_DATA}
        columnsTitle={reportColumnsTitle}
        fields={reportFields}
      />

      <SavePreferencesForm
        open={openSavePreferences}
        onOpenChange={setOpenSavePreferences}
        preferences={savedPreferences}
        maxOccurrences={maxPreferenceOccurrences}
        isSubmitting={isSavingPreference}
        onConfirm={({ name, index }) =>
          saveColumnPreference({
            name,
            index,
            command: "new",
          })
        }
      />
    </div>
  )
}
