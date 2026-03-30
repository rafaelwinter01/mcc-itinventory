import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Award, BadgeCheck } from "lucide-react"

export type LicenseCardData = {
  id: number
  name: string
  description: string | null
  cost: string | null
  billingFrequency: string | null
}

export type LicenseCardProps = {
  license: LicenseCardData
  onEdit?: (id: number) => void
  variant?: "default" | "compact" | "classic"
}

const getCardInteractionProps = (licenseId: number, onEdit?: (id: number) => void) => {
  if (!onEdit) {
    return {
      onClick: undefined,
      role: undefined,
      tabIndex: undefined,
      onKeyDown: undefined,
    }
  }

  return {
    onClick: () => onEdit(licenseId),
    role: "button" as const,
    tabIndex: 0,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onEdit(licenseId)
      }
    },
  }
}

const formatCost = (cost: string | null) => {
  return cost ? `$${cost}` : "Not specified"
}

function LicenseCardCompact({ license, onEdit }: LicenseCardProps) {
  const interaction = getCardInteractionProps(license.id, onEdit)

  return (
    <Card
      className={cn(
        "w-full p-0",
        onEdit && "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40"
      )}
      {...interaction}
    >
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-12 sm:items-center">
        <div className="sm:col-span-4">
          <p className="truncate text-base font-semibold" title={license.name}>{license.name}</p>
          <p className="truncate text-xs text-muted-foreground" title={license.description || "No description"}>
            {license.description || "No description"}
          </p>
        </div>

        <div className="sm:col-span-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Cost</p>
          <p className="text-sm font-medium">{formatCost(license.cost)}</p>
        </div>

        <div className="sm:col-span-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Billing Frequency</p>
          <p className="text-sm font-medium">{license.billingFrequency || "Not specified"}</p>
        </div>

        <div className="flex justify-start sm:col-span-2 sm:justify-end">
          <div className="rounded-full bg-primary/10 p-1.5">
            <BadgeCheck className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function LicenseCardClassic({ license, onEdit }: LicenseCardProps) {
  const interaction = getCardInteractionProps(license.id, onEdit)

  return (
    <Card
      className={cn(
        "w-full p-3",
        onEdit && "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40"
      )}
      {...interaction}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-center">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">License</p>
          <p className="truncate text-sm font-bold" title={license.name}>{license.name}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</p>
          <p className="truncate text-sm font-medium">{formatCost(license.cost)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Billing</p>
          <p className="truncate text-sm font-medium">{license.billingFrequency || "Not specified"}</p>
        </div>
        <div className="flex justify-start sm:justify-end">
          <div className="rounded-full bg-primary/10 p-1.5">
            <BadgeCheck className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export function LicenseCard({ license, onEdit, variant = "default" }: LicenseCardProps) {
  if (variant === "compact") {
    return <LicenseCardCompact license={license} onEdit={onEdit} />
  }

  if (variant === "classic") {
    return <LicenseCardClassic license={license} onEdit={onEdit} />
  }

  const interaction = getCardInteractionProps(license.id, onEdit)

  return (
    <Card
      className={`w-full ${
        onEdit
          ? "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40"
          : ""
      }`}
      {...interaction}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{license.name}</CardTitle>
            <CardDescription>{license.description || "No description"}</CardDescription>
          </div>
          <div className="rounded-full bg-primary/10 p-1.5">
            <BadgeCheck className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Cost</div>
          <p className="mt-1 text-sm text-secondary-foreground">
            {formatCost(license.cost)}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Billing Frequency
          </div>
          <p className="mt-1 text-sm text-secondary-foreground">
            {license.billingFrequency || "Not specified"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
