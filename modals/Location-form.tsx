"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, MapPin } from "lucide-react"

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
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  address: z.string().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof formSchema>

type User = {
  id: number
  firstname: string
  lastname: string
}

type Location = {
  id: number
  name: string
  address: string | null
  managerName?: string | null
  managerLastname?: string | null
}

type LocationFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LocationForm({ open, onOpenChange, onSuccess }: LocationFormProps) {
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      managerId: "",
    },
  })

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const [locRes, userRes] = await Promise.all([
        fetch("/api/location"),
        fetch("/api/user")
      ])
      
      if (locRes.ok) setLocations(await locRes.json())
      if (userRes.ok) setUsers(await userRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchData()
      form.reset()
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const response = await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          managerId: values.managerId ? Number(values.managerId) : null
        }),
      })

      if (response.ok) {
        toast.success("Location added successfully")
        form.reset()
        fetchData()
        onSuccess?.()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to add location")
      }
    } catch (error) {
      console.error("Error adding location:", error)
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Add Location
          </DialogTitle>
          <DialogDescription>
            Register a new physical location or office.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Street, City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.firstname} {user.lastname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Location
              </Button>
            </div>
          </form>
        </Form>

        <div className="pt-6 border-t mt-4">
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
            Existing Locations
          </h4>
          {loadingData ? (
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No locations registered yet.</p>
              ) : (
                locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="group relative px-3 py-1.5 rounded-md bg-muted/50 border text-sm flex flex-col gap-0.5 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{loc.name}</span>
                    {loc.managerName && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        Manager: {loc.managerName} {loc.managerLastname}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
