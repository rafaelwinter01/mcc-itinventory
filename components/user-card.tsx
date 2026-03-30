import { Laptop, User } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type UserCardDevice = {
  id: number
  name: string
  deviceTypeName?: string | null
}

export type UserCardProps = {
  id: number
  firstname: string
  lastname: string
  email: string | null
  departmentName: string | null
  createdAt: string
  devices: UserCardDevice[]
  variant?: "default" | "classic" | "compact"
  onClick?: () => void
}

const getDeviceTooltip = (devices: UserCardDevice[]) => {
  if (!devices.length) {
    return "No devices assigned"
  }

  return devices
    .map((device) =>
      device.deviceTypeName ? `${device.name} (${device.deviceTypeName})` : device.name
    )
    .join(", ")
}

const renderDeviceBadge = (device: UserCardDevice) => (
  <Badge
    key={device.id}
    variant="secondary"
    className="max-w-40 truncate"
    title={device.deviceTypeName || undefined}
  >
    {device.name}
  </Badge>
)


function UserCardClassic({ firstname, lastname, email, departmentName, createdAt, devices, onClick }: UserCardProps) {
  return (
    <Card className={cn("w-full p-0", onClick && "cursor-pointer transition hover:border-primary/50")} onClick={onClick}>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-12 sm:items-center">
        <div className="sm:col-span-3">
          <p className="truncate text-base font-semibold" title={`${firstname} ${lastname}`}>
            {firstname} {lastname}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={email || "No email provided"}>
            {email || "No email provided"}
          </p>
        </div>

        <div className="sm:col-span-4">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Devices</p>
          <p className="truncate text-sm" title={getDeviceTooltip(devices)}>
            {devices.length ? devices.map((device) => device.name).join(", ") : "No devices assigned"}
          </p>
        </div>

        <div className="sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Department</p>
          <p className="truncate text-sm">{departmentName || "N/A"}</p>
        </div>

        <div className="sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Registration</p>
          <p className="text-sm">{new Date(createdAt).toLocaleDateString()}</p>
        </div>

        <div className="flex justify-start sm:col-span-1 sm:justify-end">
          <div className="rounded-full bg-primary/10 p-2">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function UserCardCompact({ firstname, lastname, email, departmentName, createdAt, devices, onClick }: UserCardProps) {
  const visibleDevices = devices.slice(0, 3)
  const remainingDevicesCount = Math.max(0, devices.length - visibleDevices.length)

  return (
    <Card 
      className={cn("shadow-sm", onClick && "cursor-pointer transition-colors hover:border-primary/50")}
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">
              {firstname} {lastname}
            </CardTitle>
            <p className="truncate text-xs text-muted-foreground leading-tight mt-1" title={email || "No email provided"}>
              {email || "No email provided"}
            </p>            
          </div>
          <div className="rounded-full bg-primary/10 p-1.5">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="hidden" />
      <CardFooter className="pt-0 pb-0 flex justify-between items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Department</p>
            <p className="truncate text-sm">{departmentName || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Devices</p>
            <div className="mt-1 flex flex-wrap gap-1" title={getDeviceTooltip(devices)}>
              {visibleDevices.length ? (
                <>
                  {visibleDevices.map(renderDeviceBadge)}
                  {remainingDevicesCount > 0 ? (
                    <Badge variant="outline">+{remainingDevicesCount}</Badge>
                  ) : null}
                </>
              ) : (
                <Badge variant="outline">No devices assigned</Badge>
              )}
            </div>
        </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Registration</p>
            <p className="text-sm">{new Date(createdAt).toLocaleDateString()}</p>
          </div>
      </CardFooter>
    </Card>
  )
}

function UserCardDefault({ firstname, lastname, email, departmentName, createdAt, devices, onClick }: UserCardProps) {
  const visibleDevices = devices.slice(0, 3)
  const remainingDevicesCount = Math.max(0, devices.length - visibleDevices.length)

  return (
    <Card
      className={cn("hover:border-primary/50 transition-colors shadow-sm", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {firstname} {lastname}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate max-w-50">
              {email || "No email provided"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1" title={getDeviceTooltip(devices)}>
              {visibleDevices.length ? (
                <>
                  {visibleDevices.map(renderDeviceBadge)}
                  {remainingDevicesCount > 0 ? (
                    <Badge variant="outline">+{remainingDevicesCount}</Badge>
                  ) : null}
                </>
              ) : (
                <Badge variant="outline">No devices assigned</Badge>
              )}
            </div>
          </div>
          <div className="rounded-full bg-primary/10 p-2">
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-row gap-4 items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Department
            </span>
            <span className="text-sm font-medium">
              {departmentName || "N/A"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Registration Date
            </span>
            <span className="text-sm font-medium">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UserCard({ variant = "default", ...props }: UserCardProps) {
  if (variant === "classic") {
    return <UserCardClassic {...props} variant={variant} />
  }

  if (variant === "compact") {
    return <UserCardCompact {...props} variant={variant} />
  }

  return <UserCardDefault {...props} variant={variant} />
}
