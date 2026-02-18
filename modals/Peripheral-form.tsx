"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Plus, Package } from "lucide-react"

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

type Peripheral = {
  id: number
  name: string
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(150, "Name is too long"),
})

type FormValues = z.infer<typeof formSchema>

type PeripheralFormProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function PeripheralForm({ open: controlledOpen, onOpenChange, onSuccess }: PeripheralFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [peripheralList, setPeripheralList] = useState<Peripheral[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  })

  const fetchPeripheralList = useCallback(async () => {
    setLoadingList(true)
    try {
      const response = await fetch("/api/peripheral")
      if (response.ok) {
        const data = await response.json()
        setPeripheralList(data)
      } else {
        toast.error("Failed to load peripheral list")
      }
    } catch (error) {
      console.error("Error fetching peripherals:", error)
      toast.error("An error occurred while loading peripherals")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchPeripheralList()
      form.reset()
    }
  }, [open, fetchPeripheralList, form])

  const onSubmit = async (values: FormValues) => {
    setLoading(true)
    try {
      const response = await fetch("/api/peripheral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Peripheral created successfully")
        form.reset()
        fetchPeripheralList()
        if (onSuccess) onSuccess()
      } else {
        toast.error(data.error || "Failed to create peripheral")
      }
    } catch (error) {
      console.error("Error creating peripheral:", error)
      toast.error("An error occurred while creating peripheral")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Manage Peripherals</DialogTitle>
          <DialogDescription>
            Add new peripherals or view the existing list.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peripheral Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter peripheral name" {...field} />
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
                  Add Peripheral
                </>
              )}
            </Button>
          </form>
        </Form>

        <Separator />

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Existing Peripherals</h4>
          <ScrollArea className="h-50 rounded-md border p-4">
            {loadingList ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : peripheralList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                <Package className="h-8 w-8 opacity-20" />
                <p className="text-sm">No peripherals found</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {peripheralList.map((item) => (
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
