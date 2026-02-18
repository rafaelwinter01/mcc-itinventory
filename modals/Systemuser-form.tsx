"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Copy, Check, Eye, EyeOff } from "lucide-react"

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
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
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      role: "common",
    },
  })

  useEffect(() => {
    if (open) {
      if (systemUser) {
        form.reset({
          username: systemUser.username,
          role: systemUser.role as "admin" | "common",
        })
      } else {
        form.reset({
          username: "",
          role: "common",
        })
      }
    } else {
      setGeneratedPassword(null)
      setShowPassword(false)
      setCopied(false)
    }
  }, [open, systemUser, form])

  const onSubmit = async (values: FormValues) => {
    if (!user.email) {
      toast.error("User must have an email address to request system access.")
      return
    }

    setLoading(true)
    try {
      const method = systemUser ? "PUT" : "POST"
      const response = await fetch("/api/user/system", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          username: values.username,
          role: values.role,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(systemUser ? "Access updated successfully" : "Access granted successfully")
        setGeneratedPassword(data.password)
        onSuccess?.()
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

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Password copied to clipboard")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{systemUser ? "Update System Access" : "Grant System Access"}</DialogTitle>
          <DialogDescription>
            {systemUser 
              ? `Manage system account for ${user.firstname} ${user.lastname}.` 
              : `Create a new system account for ${user.firstname} ${user.lastname}.`}
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="space-y-4 py-4">
            <Alert variant="default" className="bg-primary/5 border-primary/20">
              <AlertTitle className="font-semibold text-primary">Success!</AlertTitle>
              <AlertDescription>
                The system account has been {systemUser ? "updated" : "created"}. 
                <p className="mt-2 font-bold text-destructive">
                  IMPORTANT: Copy this password now. It will not be shown again.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temporary Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={generatedPassword}
                    readOnly
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <FormLabel>Collaborator Email</FormLabel>
                <Input value={user.email || "No email provided"} disabled className="bg-muted" />
                {!user.email && (
                  <p className="text-xs text-destructive">Email is required to grant system access.</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="jdoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Button type="submit" disabled={loading || !user.email}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {systemUser ? "Update Access" : "Grant Access"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
