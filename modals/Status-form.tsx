"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type Status = {
  id: number
  name: string
  color: string | null
}

const colorOptions = [
  { value: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Green" },
  { value: "bg-sky-100 text-sky-700 border-sky-300", label: "Blue" },
  { value: "bg-amber-100 text-amber-700 border-amber-300", label: "Yellow" },
  { value: "bg-orange-100 text-orange-700 border-orange-300", label: "Orange" },
  { value: "bg-slate-100 text-slate-700 border-slate-300", label: "Gray" },
  { value: "bg-rose-100 text-rose-700 border-rose-300", label: "Red" },
  { value: "bg-purple-100 text-purple-700 border-purple-300", label: "Purple" },
  { value: "bg-pink-100 text-pink-700 border-pink-300", label: "Pink" },
  { value: "bg-indigo-100 text-indigo-700 border-indigo-300", label: "Indigo" },
  { value: "bg-teal-100 text-teal-700 border-teal-300", label: "Teal" },
  { value: "bg-lime-100 text-lime-700 border-lime-300", label: "Lime" },
  { value: "bg-cyan-100 text-cyan-700 border-cyan-300", label: "Cyan" },
]

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  color: z.string().min(1, "Color is required"),
})

type FormValues = z.infer<typeof formSchema>

type StatusFormProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function StatusForm({ open: controlledOpen, onOpenChange, onSuccess }: StatusFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusList, setStatusList] = useState<Status[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "",
    },
  })

  const fetchStatusList = async () => {
    setLoadingList(true)
    try {
      const response = await fetch("/api/status")
      if (response.ok) {
        const data = await response.json()
        setStatusList(data)
      } else {
        toast.error("Failed to load status list")
      }
    } catch (error) {
      console.error("Error fetching status:", error)
      toast.error("Failed to load status list")
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStatusList()
    }
  }, [open])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        toast.success("Status created successfully")
        form.reset()
        setOpen(false)
        onSuccess?.()
        fetchStatusList()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create status")
      }
    } catch (error) {
      console.error("Error creating status:", error)
      toast.error("Failed to create status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Add New Status</DialogTitle>
          <DialogDescription>
            Create a new status with a name and color. Status names must be unique.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
              <div className="flex flex-col flex-1 md:flex-row w-full gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Active, Pending, Retired" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem >
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${option.value}`}
                                >
                                  {option.label}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Status"}
                </Button>
              </DialogFooter>
            </form>
          </Form>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing Status</h4>
            {loadingList ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : statusList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status created yet</p>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="flex flex-wrap gap-2">
                  {statusList.map((status) => (
                    <span
                      key={status.id}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        status.color || "bg-muted text-muted-foreground border-muted"
                      }`}
                    >
                      {status.name}
                    </span>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
