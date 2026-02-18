import { User } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type UserCardProps = {
  id: number
  firstname: string
  lastname: string
  email: string | null
  departmentName: string | null
  createdAt: string
  onClick?: () => void
}

export function UserCard({ 
  firstname, 
  lastname, 
  email, 
  departmentName, 
  createdAt,
  onClick 
}: UserCardProps) {
  return (
    <Card 
      className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer" 
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
