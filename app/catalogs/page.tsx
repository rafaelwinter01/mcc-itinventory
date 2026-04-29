import { notFound, redirect } from "next/navigation"
import { CatalogsClient } from "./catalogs-client"
import { getSession } from "@/lib/session"

export default async function CatalogsPage() {
  const sessionUser = await getSession()

  if (!sessionUser) {
    redirect("/login")
  }

  if (sessionUser.role !== "admin") {
    notFound()
  }

  return <CatalogsClient isAdmin={sessionUser.role === "admin"} />
}