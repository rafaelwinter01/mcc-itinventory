"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Settings, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SystemUserForm } from "./Systemuser-form"
import { UserLicenseForm } from "./UserLicense-form"

type Department = {
  id: number
  name: string
}

type SystemUser = {
  id: number
  userId: number
  username: string
  role: string
  isActive: number
}

type UserRecord = {
  id: number
  firstname: string
  lastname: string
  email: string | null
  departmentId: number | null
  departmentName?: string | null
  createdAt: string
}

type UserLicenseItem = {
  licenseId: number
  name: string
  cost: string | null
  billingFrequency: string | null
  createdAt: string
}

const formSchema = z.object({
  firstname: z.string().min(1, "First name is required").max(100, "First name is too long"),
  lastname: z.string().min(1, "Last name is required").max(100, "Last name is too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  departmentId: z.string().min(1, "Department is required"),
})

type FormValues = z.infer<typeof formSchema>

type UserFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editUser?: UserRecord | null
}

export function UserForm({ open, onOpenChange, onSuccess, editUser }: UserFormProps) {
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null)
  const [loadingSystemUser, setLoadingSystemUser] = useState(false)
  const [showSystemUserModal, setShowSystemUserModal] = useState(false)
  const [userLicenses, setUserLicenses] = useState<UserLicenseItem[]>([])
  const [loadingLicenses, setLoadingLicenses] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      departmentId: "",
    },
  })

  useEffect(() => {
    if (open) {
      fetchDepartments()
      fetchSystemUser()
      fetchUserLicenses()
      
      if (editUser) {
        form.reset({
          firstname: editUser.firstname,
          lastname: editUser.lastname,
          email: editUser.email || "",
          departmentId: editUser.departmentId ? String(editUser.departmentId) : "",
        })
      } else {
        form.reset({
          firstname: "",
          lastname: "",
          email: "",
          departmentId: "",
        })
      }
    }
  }, [open, form, editUser, editUser?.id])

  const fetchDepartments = async () => {
    setLoadingDepts(true)
    try {
      const response = await fetch("/api/department")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast.error("Failed to load departments")
    } finally {
      setLoadingDepts(false)
    }
  }

  const fetchSystemUser = async () => {
    if (editUser?.id) {
      setLoadingSystemUser(true)
      try {
        const response = await fetch(`/api/user/system?userId=${editUser.id}`)
        if (response.ok) {
          const data = await response.json()
          setSystemUser(data)
        } else {
          setSystemUser(null)
        }
      } catch (error) {
        console.error("Error fetching system user:", error)
        setSystemUser(null)
      } finally {
        setLoadingSystemUser(false)
      }
    } else {
      setSystemUser(null)
    }
  }

  const fetchUserLicenses = async () => {
    if (editUser?.id) {
      setLoadingLicenses(true)
      try {
        const response = await fetch(`/api/user/license?userId=${editUser.id}`)
        if (response.ok) {
          const data = await response.json()
          setUserLicenses(data)
        } else {
          setUserLicenses([])
        }
      } catch (error) {
        console.error("Error fetching user licenses:", error)
        setUserLicenses([])
      } finally {
        setLoadingLicenses(false)
      }
    } else {
      setUserLicenses([])
    }
  }

  const handleRemoveLicense = async (licenseId: number) => {
    if (!editUser?.id) return
    try {
      const response = await fetch("/api/user/license", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: editUser.id, licenseId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data?.error || "Failed to remove license")
        return
      }

      toast.success("License removed")
      fetchUserLicenses()
    } catch (error) {
      console.error("Error removing license:", error)
      toast.error("An error occurred while removing the license")
    }
  }

  const onSubmit = async (values: FormValues) => {
    console.log("UserForm onSubmit called with values:", values)
    setLoading(true)
    try {
      const method = editUser ? "PUT" : "POST"
      const body = editUser ? { ...values, id: editUser.id, departmentId: Number(values.departmentId) } : { ...values, departmentId: Number(values.departmentId) }
      
      console.log("Making API call:", { method, url: "/api/user", body })
      
      const response = await fetch("/api/user", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      console.log("API Response status:", response.status)
      const data = await response.json()
      console.log("API Response data:", data)

      if (response.ok) {
        toast.success(editUser ? "Collaborator updated successfully" : "Collaborator added successfully")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(data.error || `Failed to ${editUser ? 'update' : 'add'} collaborator`)
      }
    } catch (error) {
      console.error(`Error ${editUser ? 'updating' : 'adding'} collaborator:`, error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{editUser ? 'Edit Collaborator' : 'Add Collaborator'}</DialogTitle>
          <DialogDescription>
            {editUser ? 'Update collaborator information.' : 'Register a new collaborator in the organization.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="firstname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingDepts ? "Loading..." : "Select a department"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {editUser && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Licences</div>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowLicenseModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                <div className="rounded-md border">
                  <div className="grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <div>Name</div>
                    <div>Cost</div>
                    <div>Billing</div>
                    <div>Assigned</div>
                    <div>-</div>
                  </div>
                  <div className="divide-y max-h-28 overflow-y-auto">
                    {loadingLicenses ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">Loading licenses...</div>
                    ) : userLicenses.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">No licenses assigned.</div>
                    ) : (
                      userLicenses.map((item) => (
                        <div
                          key={`${editUser.id}-${item.licenseId}`}
                          className="grid grid-cols-[1.6fr_0.8fr_0.8fr_1fr_auto] gap-2 px-3 py-2"
                        >
                          <span
                            className="text-sm font-medium"
                            title={item.name}
                          >
                            {item.name.length > 20 ? `${item.name.slice(0, 20)}...` : item.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.cost ? `$${item.cost}` : "-"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.billingFrequency || "-"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString()
                              : "-"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLicense(item.licenseId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {editUser && (
              <div className="space-y-2">
                <div className="text-sm font-medium">System Access</div>
                {loadingSystemUser ? (
                  <div className="text-sm text-muted-foreground">Loading system user...</div>
                ) : systemUser ? (
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <div>
                      <div className="text-sm font-medium">Username: {systemUser.username}</div>
                      <div className="text-xs text-muted-foreground">Role: {systemUser.role}</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="text-xs text-muted-foreground mr-2">
                        {systemUser.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowSystemUserModal(true)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSystemUserModal(true)}
                    disabled={!editUser.email}
                  >
                    Request System Access
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editUser ? 'Update Collaborator' : 'Save Collaborator'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {editUser && (
        <SystemUserForm
          open={showSystemUserModal}
          onOpenChange={setShowSystemUserModal}
          user={editUser}
          systemUser={systemUser}
          onSuccess={fetchSystemUser}
        />
      )}

      {editUser && (
        <UserLicenseForm
          open={showLicenseModal}
          onOpenChange={setShowLicenseModal}
          userId={editUser.id}
          assignedIds={userLicenses.map((item) => item.licenseId)}
          onSuccess={fetchUserLicenses}
        />
      )}
    </Dialog>
  )
}
