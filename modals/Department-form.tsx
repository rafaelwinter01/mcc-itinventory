"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export type Department = {
  id: number
  name: string
}

type DepartmentFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DepartmentForm({ open, onOpenChange, onSuccess }: DepartmentFormProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [name, setName] = useState("")

  const fetchDepartments = async () => {
    setLoadingList(true)
    try {
      const res = await fetch("/api/department")
      if (!res.ok) throw new Error("Failed to fetch departments")
      const data = await res.json()
      setDepartments(data)
    } catch (e) {
      toast.error("Failed to load departments")
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchDepartments()
      setName("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/department", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error("Failed to add department")
      toast.success("Department added successfully")
      setName("")
      fetchDepartments()
      onSuccess?.()
    } catch (e) {
      toast.error("Failed to add department")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>
            Register a new department and view existing ones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input
            placeholder="Department name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={loading}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save Department"}
            </Button>
          </div>
        </form>
        <div className="pt-6">
          <h4 className="font-semibold mb-2">Existing Departments</h4>
          {loadingList ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-3/4" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
              {departments.map(dept => (
                <span
                  key={dept.id}
                  className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground border border-muted-foreground/20 shadow-sm"
                >
                  {dept.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
