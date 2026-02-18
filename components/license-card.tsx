import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type LicenseCardData = {
  id: number
  name: string
  description: string | null
  cost: string | null
  billingFrequency: string | null
}

type LicenseCardProps = {
  license: LicenseCardData
  onEdit?: (id: number) => void
}

export function LicenseCard({ license, onEdit }: LicenseCardProps) {
  return (
    <Card
      className={`w-full ${
        onEdit
          ? "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40"
          : ""
      }`}
      onClick={onEdit ? () => onEdit(license.id) : undefined}
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onKeyDown={
        onEdit
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onEdit(license.id)
              }
            }
          : undefined
      }
    >
      <CardHeader>
        <CardTitle>{license.name}</CardTitle>
        <CardDescription>{license.description || "No description"}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Cost</div>
          <p className="mt-1 text-sm text-secondary-foreground">
            {license.cost ? `$${license.cost}` : "Not specified"}
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
