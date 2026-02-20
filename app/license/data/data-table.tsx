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
import { ArrowUpDown, ChevronDown, FileDown, Pencil, Trash2 } from "lucide-react"
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
import { MultiEditUserLicenseForm } from "../../../modals/MultiEditUserLicense-form"
import { ExportUserLicensesModal } from "../../../modals/ExportUserLicenses-Modal"

type AppliedFilter = {
  name: string
  value: string
}

export type UserLicenseExportFilters = {
  userId?: string
  licenseId?: string
  active?: string
  q?: string
}

type NumberRangeFilterValue = {
  min?: string
  max?: string
}

type DateRangeFilterValue = {
  from?: string
  to?: string
}

const COLUMN_INPUT_TYPE: Record<string, "text" | "number" | "date"> = {
  userName: "text",
  userEmail: "text",
  licenseName: "text",
  cost: "number",
  billingFrequency: "text",
  active: "text",
  createdAt: "date",
  updatedAt: "date",
}

const getFilterInputType = (columnId: string): "text" | "number" | "date" =>
  COLUMN_INPUT_TYPE[columnId] ?? "text"

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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  appliedFilters: AppliedFilter[]
  exportFilters: UserLicenseExportFilters
}

export function DataTable<TData, TValue>({
  columns,
  data,
  appliedFilters,
  exportFilters,
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
        pageSize: 50,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const selectedItems = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => {
      const original = row.original as { userId: number; licenseId: number }
      return { userId: original.userId, licenseId: original.licenseId }
    })

  const listedItems = data
    .map((row) => {
      const original = row as { userId: number; licenseId: number }
      return { userId: original.userId, licenseId: original.licenseId }
    })
    .filter((item) => typeof item.userId === "number" && typeof item.licenseId === "number")

  const selectedCount = selectedItems.length
  const appliesLabel = selectedCount > 0 ? `Selected (${selectedCount})` : "None"

  const exportFields = React.useMemo(
    () => [
      { key: "userName", label: "User" },
      { key: "userEmail", label: "Email" },
      { key: "licenseName", label: "License" },
      { key: "cost", label: "Cost" },
      { key: "billingFrequency", label: "Billing" },
      { key: "active", label: "Active" },
      { key: "createdAt", label: "Assigned At" },
      { key: "updatedAt", label: "Updated At" },
    ],
    []
  )

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border bg-card/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">Applies to:</span>
            <span className="text-xs font-medium">{appliesLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditOpen(true)}
              disabled={selectedItems.length === 0}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsDeleteOpen(true)}
              disabled={selectedItems.length === 0}
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
          </div>
        </div>

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
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsWithSelection.length} className="h-24 text-center">
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
            onValueChange={(value) => table.setPageSize(Number(value))}
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
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk edit user licenses</DialogTitle>
          </DialogHeader>
          <MultiEditUserLicenseForm
            items={selectedItems}
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
            You are about to delete {selectedItems.length} user license assignment(s). This action
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
              disabled={isDeleting || selectedItems.length === 0}
              onClick={async () => {
                if (selectedItems.length === 0) return
                setIsDeleting(true)
                const response = await fetch("/api/user-license/bulk", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items: selectedItems }),
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

      <ExportUserLicensesModal
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        selectedItems={selectedItems}
        listedItems={listedItems}
        selectedFields={exportFields}
        allFields={exportFields}
        appliedFilters={appliedFilters}
        filters={exportFilters}
      />
    </div>
  )
}
