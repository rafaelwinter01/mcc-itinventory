"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type UserLicenseBulkItem = {
  userId: number
  licenseId: number
}

type MultiEditUserLicenseFormProps = {
  items: UserLicenseBulkItem[]
  onCancel: () => void
  onUpdated: () => void
}

export function MultiEditUserLicenseForm({
  items,
  onCancel,
  onUpdated,
}: MultiEditUserLicenseFormProps) {
  const [applyCost, setApplyCost] = useState(false)
  const [applyBilling, setApplyBilling] = useState(false)
  const [applyActive, setApplyActive] = useState(false)
  const [cost, setCost] = useState("")
  const [billingFrequency, setBillingFrequency] = useState("")
  const [active, setActive] = useState("true")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!applyCost && !applyBilling && !applyActive) {
      toast.error("Select at least one field to update")
      return
    }

    const payload: {
      items: UserLicenseBulkItem[]
      cost?: string | null
      billingFrequency?: string | null
      active?: boolean
    } = { items }

    if (applyCost) {
      payload.cost = cost.trim() ? cost.trim() : null
    }

    if (applyBilling) {
      payload.billingFrequency = billingFrequency.trim() ? billingFrequency.trim() : null
    }

    if (applyActive) {
      payload.active = active === "true"
    }

    setIsSubmitting(true)
    const response = await fetch("/api/user-license/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setIsSubmitting(false)

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      toast.error(data?.error || "Failed to update user licenses")
      return
    }

    toast.success("User licenses updated")
    onUpdated()
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <Checkbox checked={applyCost} onCheckedChange={(value) => setApplyCost(Boolean(value))} />
          <span className="text-sm font-medium">Update cost</span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="bulkCost">Cost</Label>
          <Input
            id="bulkCost"
            placeholder="Ex: 49.99"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            disabled={!applyCost}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={applyBilling}
            onCheckedChange={(value) => setApplyBilling(Boolean(value))}
          />
          <span className="text-sm font-medium">Update billing frequency</span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="bulkBilling">Billing frequency</Label>
          <Input
            id="bulkBilling"
            placeholder="Ex: Monthly"
            value={billingFrequency}
            onChange={(event) => setBillingFrequency(event.target.value)}
            disabled={!applyBilling}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={applyActive}
            onCheckedChange={(value) => setApplyActive(Boolean(value))}
          />
          <span className="text-sm font-medium">Update active status</span>
        </label>
        <div className="space-y-2">
          <Label htmlFor="bulkActive">Active</Label>
          <Select value={active} onValueChange={setActive} disabled={!applyActive}>
            <SelectTrigger id="bulkActive">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Apply updates"}
        </Button>
      </div>
    </form>
  )
}
