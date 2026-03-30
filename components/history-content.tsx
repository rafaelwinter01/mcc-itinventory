"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type HistoryRecord = {
  id: number
  userId: number | null
  action: string
  entityName: string
  description: string | null
  entityId: number | null
  createdAt: string | null
  username: string | null
}

function formatHistoryDate(dateValue: string | null) {
  if (!dateValue) return "N/A"
  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) return "N/A"

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate)
}

interface HistoryContentProps {
  entityId: number
  entityName: string
}

export function HistoryContent({ entityId, entityName }: HistoryContentProps) {
  const [items, setItems] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const loadHistory = async () => {
      try {
        setLoading(true)

        const params = new URLSearchParams({
          entityId: String(entityId),
          entityName,
        })

        const response = await fetch(`/api/history?${params.toString()}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to fetch history")
        }

        const data = (await response.json()) as HistoryRecord[]
        setItems(Array.isArray(data) ? data : [])
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }

        console.error("Error loading history:", error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    void loadHistory()

    return () => controller.abort()
  }, [entityId, entityName])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <p className="text-xs">Loading history...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
        <FileText className="mb-2 h-8 w-8 opacity-20" />
        <p className="text-xs">No history records for this device.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-60 pr-2">
      <div>
        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <Separator />}
            <div className="py-3">
              <div className="flex items-start justify-center  gap-2">
                <div className="min-w-0 flex flex-1 items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.action}
                  </Badge>
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {item.description || "No description"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {formatHistoryDate(item.createdAt)}
                    <div className="mt-1 text-xs text-accent-foreground">
                        {item.username || "Unknown user"}
                    </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
