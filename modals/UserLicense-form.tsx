"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export type LicenseOption = {
  id: number
  name: string
  cost: string | null
  billingFrequency: string | null
}

type UserLicenseFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  assignedIds?: number[]
  onSuccess?: () => void
}

export function UserLicenseForm({
  open,
  onOpenChange,
  userId,
  assignedIds = [],
  onSuccess,
}: UserLicenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [licenses, setLicenses] = useState<LicenseOption[]>([])

  const assignedSet = useMemo(() => new Set(assignedIds), [assignedIds])

  useEffect(() => {
    if (!open) return

    const fetchLicenses = async () => {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (search.trim()) {
          query.set("name", search.trim())
        }
        const response = await fetch(`/api/license?${query.toString()}`)
        if (!response.ok) {
          toast.error("Failed to load licenses")
          return
        }
        const data = (await response.json()) as LicenseOption[]
        setLicenses(data)
      } catch (error) {
        console.error("Error loading licenses:", error)
        toast.error("An error occurred while loading licenses")
      } finally {
        setLoading(false)
      }
    }

    fetchLicenses()
  }, [open, search])

  const handleAssign = async (licenseId: number) => {
    try {
      const response = await fetch("/api/user/license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, licenseId }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data?.error || "Failed to assign license")
        return
      }

      toast.success("License assigned")
      onSuccess?.()
    } catch (error) {
      console.error("Error assigning license:", error)
      toast.error("An error occurred while assigning the license")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add License</DialogTitle>
          <DialogDescription>Select a license to assign to this user.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search license by name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Separator />

          <ScrollArea className="h-72 rounded-md border p-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-sm text-muted-foreground">No licenses found.</div>
            ) : (
              <div className="space-y-3">
                {licenses.map((licenseItem) => {
                  const isAssigned = assignedSet.has(licenseItem.id)
                  return (
                    <div
                      key={licenseItem.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{licenseItem.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Cost: {licenseItem.cost ? `$${licenseItem.cost}` : "Not specified"} · Billing: {licenseItem.billingFrequency || "Not specified"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isAssigned ? "outline" : "default"}
                        disabled={isAssigned}
                        onClick={() => handleAssign(licenseItem.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {isAssigned ? "Assigned" : "Add"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
