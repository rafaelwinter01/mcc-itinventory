"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const formSchema = z.object({
  role: z.enum(["admin", "common"], {
    message: "Please select a role",
  }),
})

type FormValues = z.infer<typeof formSchema>

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
}

type SystemUserFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRecord
  systemUser?: SystemUser | null
  onSuccess?: () => void
}

export function SystemUserForm({ open, onOpenChange, user, systemUser, onSuccess }: SystemUserFormProps) {
  const [loading, setLoading] = useState(false)
  const hasUsername = Boolean(systemUser?.username?.trim())
  const isActive = Boolean(systemUser?.isActive)
  const canSendInvitation = !systemUser || !isActive
  const canEditRole = !systemUser || !isActive

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "common",
    },
  })

  useEffect(() => {
    if (open) {
      if (systemUser) {
        form.reset({
          role: systemUser.role as "admin" | "common",
        })
      } else {
        form.reset({
          role: "common",
        })
      }
    }
  }, [open, systemUser, form])

  const onSubmit = async (values: FormValues) => {
    if (!canSendInvitation) {
      return
    }

    if (!user.email) {
      toast.error("User must have an email address to request system access.")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/user/system/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          role: values.role,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Invitation sent successfully")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(data.error || "Something went wrong")
      }
    } catch (error) {
      console.error("Error managing system access:", error)
      toast.error("Failed to process request")
    } finally {
      setLoading(false)
    }
  }

  const handleDisableUser = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/user/system/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("User disabled successfully")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(data.error || "Failed to disable user")
      }
    } catch (error) {
      console.error("Error disabling user:", error)
      toast.error("Failed to disable user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{hasUsername ? "System Access" : "Grant System Access"}</DialogTitle>
          <DialogDescription>
            {hasUsername
              ? `Manage system account for ${user.firstname} ${user.lastname}.`
              : `Send an invitation to create a system account for ${user.firstname} ${user.lastname}.`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <FormLabel>Collaborator Email</FormLabel>
              <Input value={user.email || "No email provided"} disabled className="bg-muted" />
              {!user.email && (
                <p className="text-xs text-destructive">Email is required to grant system access.</p>
              )}
            </div>

            <div className="space-y-2">
              <FormLabel>Username</FormLabel>
              <Input
                value={hasUsername ? systemUser?.username ?? "" : ""}
                placeholder={hasUsername ? "" : "Will be created after invitation acceptance"}
                disabled
                className="bg-muted"
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEditRole}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="common">Common User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {systemUser && isActive && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDisableUser}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disable User
                </Button>
              )}
              {canSendInvitation && (
                <Button type="submit" disabled={loading || !user.email}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
