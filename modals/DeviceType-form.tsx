"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Monitor } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type DeviceType = {
  id: number
  name: string
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
})

type FormValues = z.infer<typeof formSchema>

type DeviceTypeFormProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function DeviceTypeForm({ open: controlledOpen, onOpenChange, onSuccess }: DeviceTypeFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deviceTypeList, setDeviceTypeList] = useState<DeviceType[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  const fetchDeviceTypeList = useCallback(async () => {
    setLoadingList(true)
    try {
      const response = await fetch("/api/devicetype")
      if (response.ok) {
        const data = await response.json()
        setDeviceTypeList(data)
      } else {
        toast.error("Failed to load device type list")
      }
    } catch (error) {
      console.error("Error fetching device types:", error)
      toast.error("An error occurred while loading device types")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchDeviceTypeList()
      form.reset()
    }
  }, [open, fetchDeviceTypeList, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const response = await fetch("/api/devicetype", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Device type created successfully")
        form.reset()
        fetchDeviceTypeList()
        if (onSuccess) onSuccess()
      } else {
        toast.error(data.error || "Failed to create device type")
      }
    } catch (error) {
      console.error("Error creating device type:", error)
      toast.error("An error occurred while creating device type")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Manage Device Types</DialogTitle>
          <DialogDescription>
            Add new device types (Laptop, Desktop, Tablet, etc.) or view existing ones.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Type Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Laptop, Monitor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device Type
                </>
              )}
            </Button>
          </form>
        </Form>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Existing Device Types</h4>
          <ScrollArea className="h-50 rounded-md border p-4">
            {loadingList ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deviceTypeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                <Monitor className="h-8 w-8 opacity-20" />
                <p className="text-sm">No device types found</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {deviceTypeList.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
