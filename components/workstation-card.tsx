import { Pencil } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "./ui/badge"

export type WorkstationCardData = {
  id: number
  name: string
  description: string | null
  attributes: Record<string, string>
  devices: string[]
  users: string[]
}

type WorkstationCardProps = {
  workstation: WorkstationCardData
  onEdit?: (id: number) => void
}

export function WorkstationCard({ workstation, onEdit }: WorkstationCardProps) {
  const attributeEntries = Object.entries(workstation.attributes ?? {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workstation.name}</CardTitle>
        <CardDescription>{workstation.description || "No description"}</CardDescription>
        {onEdit && (
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit ${workstation.name}`}
              onClick={() => onEdit(workstation.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Attributes
          </div>
          {attributeEntries.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {attributeEntries.map(([key, value]) => (
                <Badge
                  key={`${workstation.id}-${key}`}
                  className="rounded-full border px-2.5 py-1 text-xs capitalize "
                >
                  {key}: <b className="uppercase">{value}</b>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No attributes.</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Devices</div>
            {workstation.devices.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {workstation.devices.join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No devices assigned.</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Users</div>
            {workstation.users.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {workstation.users.join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No users assigned.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
