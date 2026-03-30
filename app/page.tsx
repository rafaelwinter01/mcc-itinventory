import Link from "next/link"
import {
  ArrowUpRight,
  BadgeCheck,
  Database,
  FileSpreadsheet,
  Gauge,
  Laptop,
  MonitorSpeaker,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ENTITY_NAME_MAP from "@/constants/general"

type DashboardData = {
  summary: {
    devices: number
    workstations: number
    users: number
    licenses: number
  }
  history: Array<{
    id: number
    action: string
    entityName: string
    description: string | null
    createdAt: string | null
    userName: string | null
  }>
}

const formatDateTime = (value: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const response = await fetch(`${baseUrl}/api/main`, { cache: "no-store" })

  if (!response.ok) {
    throw new Error("Failed to load dashboard data.")
  }

  const data = (await response.json()) as DashboardData

  const summaryCards = [
    {
      id: "workstation",
      title: "Workstations",
      value: data.summary.workstations,
      detail: "Registered workstations",
      icon: MonitorSpeaker,
    },
    {
      id: "device",
      title: "Devices",
      value: data.summary.devices,
      detail: "Tracked devices",
      icon: Laptop,
    },
    {
      id: "user",
      title: "Users",
      value: data.summary.users,
      detail: "Active users",
      icon: Users,
    },
    {
      id: "license",
      title: "Licenses",
      value: data.summary.licenses,
      detail: "Registered licenses",
      icon: BadgeCheck,
    },
  ]

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-border bg-card/60 p-6 shadow-lg shadow-black/5 backdrop-blur dark:bg-card/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                MCC Inventory Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Dashboard Overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Unified view of assets, users, and licenses with real-time data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/workstation">
                  <ArrowUpRight className="size-4" /> View workstations
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/device">
                  <ArrowUpRight className="size-4" /> View devices
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((area) => {
            const Icon = area.icon
            return (
              <Card key={area.id} className="border-border bg-card/80">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardDescription className="uppercase tracking-wide text-[11px] text-muted-foreground">
                      {area.title}
                    </CardDescription>
                    <CardTitle className="mt-1 text-3xl font-semibold text-foreground">
                      {area.value}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{area.detail}</p>
                  </div>
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="px-0 text-xs text-muted-foreground w-full" asChild>
                    <Link href={`/${area.id}`}>
                      Open {area.title.toLowerCase()}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_3fr]">
          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle className="text-foreground">Records Management</CardTitle>
              <CardDescription>Access data tables for audit and reporting.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="h-auto w-full items-center justify-between gap-3 px-4 py-3"
                asChild
              >
                <Link href="/device/data">
                  <span className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Database className="size-5" />
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold">Device data</span>
                      <span className="text-xs text-muted-foreground">Inventory table</span>
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto w-full items-center justify-between gap-3 px-4 py-3"
                asChild
              >
                <Link href="/license/data">
                  <span className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileSpreadsheet className="size-5" />
                    </span>
                    <span className="flex flex-col items-start">
                      <span className="text-sm font-semibold">License data</span>
                      <span className="text-xs text-muted-foreground">Assignments table</span>
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Site Activity</CardTitle>
              <CardDescription>Recent history of recorded actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.length ? (
                    data.history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>{ENTITY_NAME_MAP[item.entityName] || item.entityName}</TableCell>
                        <TableCell className="max-w-60 truncate">
                          {item.description || "—"}
                        </TableCell>
                        <TableCell>{item.userName || "System"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No activity recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
