import { MonitorSpeaker } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"

const getCardInteractionProps = (workstationId: number, onEdit?: (id: number) => void) => {
  if (!onEdit) {
    return {
      onClick: undefined,
      role: undefined,
      tabIndex: undefined,
      onKeyDown: undefined,
    }
  }

  return {
    onClick: () => onEdit(workstationId),
    role: "button" as const,
    tabIndex: 0,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onEdit(workstationId)
      }
    },
  }
}

export type WorkstationCardData = {
  id: number
  name: string
  description: string | null
  attributes: Record<string, string>
  devices: string[]
  users: string[]
}

export type WorkstationCardProps = {
  workstation: WorkstationCardData
  onEdit?: (id: number) => void
  variant?: "default" | "classic" | "compact"
}

const EditAction = ({ workstationName, onEdit }: {
  workstationName: string
  onEdit?: (id: number) => void
}) => {
  if (!onEdit) {
    return null
  }

  return (
    <CardAction>
      <div
        className="rounded-full bg-primary/10 p-2"
        aria-label={`Edit ${workstationName}`}
        title={`Edit ${workstationName}`}
      >
        <MonitorSpeaker className="h-4 w-4 text-primary" />
      </div>
    </CardAction>
  )
}

function WorkstationCardClassic({ workstation, onEdit }: WorkstationCardProps) {
  const attributeEntries = Object.entries(workstation.attributes ?? {})
  const interaction = getCardInteractionProps(workstation.id, onEdit)

  return (
    <Card
      className={cn("w-full p-0", onEdit && "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40")}
      {...interaction}
    >
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-12 sm:items-center">
        <div className="sm:col-span-3">
          <p className="truncate text-base font-semibold" title={workstation.name}>{workstation.name}</p>
          <p className="truncate text-xs text-muted-foreground" title={workstation.description || "No description"}>
            {workstation.description || "No description"}
          </p>
        </div>

        <div className="sm:col-span-4">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Attributes</p>
          {attributeEntries.length ? (
            <p className="truncate text-sm" title={attributeEntries.map(([key, value]) => `${key}: ${value}`).join(", ")}>
              {attributeEntries.map(([key, value]) => `${key}: ${value}`).join(", ")}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No attributes.</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Devices</p>
          <p className="truncate text-sm" title={workstation.devices.join(", ") || "No devices assigned."}>
            {workstation.devices.join(", ") || "No devices assigned."}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Users</p>
          <p className="truncate text-sm" title={workstation.users.join(", ") || "No users assigned."}>
            {workstation.users.join(", ") || "No users assigned."}
          </p>
        </div>

        <div className="flex justify-start sm:col-span-1 sm:justify-end">
          <div className="rounded-full bg-primary/10 p-1.5">
            <MonitorSpeaker className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function WorkstationCardCompact({ workstation, onEdit }: WorkstationCardProps) {
  const attributeEntries = Object.entries(workstation.attributes ?? {})
  const interaction = getCardInteractionProps(workstation.id, onEdit)

  return (
    <Card
      className={cn("w-full", onEdit && "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40")}
      {...interaction}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{workstation.name}</CardTitle>
        <CardDescription className="line-clamp-1">
          {workstation.description || "No description"}
        </CardDescription>
        <EditAction
          workstationName={workstation.name}
          onEdit={onEdit}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Devices</p>
            <p className="truncate" title={workstation.devices.join(", ") || "No devices assigned."}>
              {workstation.devices.join(", ") || "No devices assigned."}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Users</p>
            <p className="truncate" title={workstation.users.join(", ") || "No users assigned."}>
              {workstation.users.join(", ") || "No users assigned."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {attributeEntries.length ? (
            attributeEntries.slice(0, 4).map(([key, value]) => (
              <Badge key={`${workstation.id}-${key}`} className="rounded-full px-2 py-0 text-[10px] capitalize">
                {key}: <b className="uppercase">{value}</b>
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No attributes.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkstationCard({ workstation, onEdit, variant = "default" }: WorkstationCardProps) {
  if (variant === "classic") {
    return <WorkstationCardClassic workstation={workstation} onEdit={onEdit} />
  }

  if (variant === "compact") {
    return <WorkstationCardCompact workstation={workstation} onEdit={onEdit} />
  }

  const attributeEntries = Object.entries(workstation.attributes ?? {})
  const interaction = getCardInteractionProps(workstation.id, onEdit)

  return (
    <Card
      className={cn(onEdit && "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40")}
      {...interaction}
    >
      <CardHeader>
        <CardTitle>{workstation.name}</CardTitle>
        <CardDescription>{workstation.description || "No description"}</CardDescription>
        <EditAction
          workstationName={workstation.name}
          onEdit={onEdit}
        />
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
