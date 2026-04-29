"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type CatalogTable =
  | "status"
  | "device-types"
  | "license"
  | "make-model"
  | "location"
  | "department"

type CatalogItem = {
  id: number
  name: string
  relatedCount: number
}

type CatalogResponse = {
  table: CatalogTable
  relatedLabel: string
  total: number
  items: CatalogItem[]
}

type CatalogsClientProps = {
  isAdmin: boolean
}

const TABLE_OPTIONS: Array<{ label: string; value: CatalogTable }> = [
  { label: "Status", value: "status" },
  { label: "Device Types", value: "device-types" },
  { label: "License", value: "license" },
  { label: "Make Model", value: "make-model" },
  { label: "Location", value: "location" },
  { label: "Department", value: "department" },
]

const TABLE_LABEL_BY_VALUE = TABLE_OPTIONS.reduce<Record<CatalogTable, string>>(
  (acc, item) => {
    acc[item.value] = item.label
    return acc
  },
  {
    status: "Status",
    "device-types": "Device Types",
    license: "License",
    "make-model": "Make Model",
    location: "Location",
    department: "Department",
  }
)

export function CatalogsClient({ isAdmin }: CatalogsClientProps) {
  const [selectedTable, setSelectedTable] = useState<CatalogTable>("status")
  const [appliedTable, setAppliedTable] = useState<CatalogTable | null>(null)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [relatedLabel, setRelatedLabel] = useState("Related")
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CatalogItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/catalog?table=${selectedTable}`, {
        cache: "no-store",
      })

      const payload = await response.json()

      if (!response.ok) {
        const message =
          typeof payload?.error === "string" ? payload.error : "Failed to load catalog data"
        throw new Error(message)
      }

      const catalogData = payload as CatalogResponse
      setAppliedTable(catalogData.table)
      setItems(catalogData.items)
      setRelatedLabel(catalogData.relatedLabel)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error"
      setItems([])
      setAppliedTable(null)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!appliedTable) {
      return
    }

    setError(null)
    setDeletingId(itemId)

    try {
      const response = await fetch(`/api/catalog/${appliedTable}/${itemId}`, {
        method: "DELETE",
      })

      const payload = await response.json()

      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Failed to delete"
        throw new Error(message)
      }

      setItems((previous) => previous.filter((item) => item.id !== itemId))
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error"
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return
    }

    const currentId = pendingDelete.id
    await handleDelete(currentId)
    setPendingDelete(null)
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catalogs</h1>
        <p className="text-muted-foreground">
          Select a catalog table and click Apply to list items with related record counts.
        </p>
      </div>

      <div className="rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            {/* <label className="text-sm font-medium">Table</label> */}
            <Select
              value={selectedTable}
              onValueChange={(value) => setSelectedTable(value as CatalogTable)}
            >
              <SelectTrigger className="w-full sm:w-70">
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {TABLE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleApply} disabled={loading} className="sm:w-auto">
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {appliedTable ? (
        <div className="space-y-3 rounded-lg border p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">{TABLE_LABEL_BY_VALUE[appliedTable]}</h2>
            <p className="text-sm text-muted-foreground">Total items: {items.length}</p>
          </div>

          {items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">{relatedLabel}</TableHead>
                  {isAdmin ? <TableHead className="w-16 text-right">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.relatedCount}</TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        {item.relatedCount === 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setPendingDelete(item)}
                            disabled={deletingId === item.id}
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No items found for this table.
            </div>
          )}
        </div>
      ) : null}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `Delete \"${pendingDelete.name}\" from ${
                    appliedTable ? TABLE_LABEL_BY_VALUE[appliedTable] : "catalog"
                  }? This action cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}