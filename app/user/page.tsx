"use client"

import { useState, useEffect } from "react"
import { UserPlus, User, Signpost } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { UserForm } from "@/modals/User-form"
import { DepartmentForm } from "@/modals/Department-form"
import { UserFilterBar } from "@/components/user-filter-bar"
import { UserCard } from "@/components/user-card"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type UserRecord = {
  id: number
  firstname: string
  lastname: string
  email: string | null
  departmentId: number | null
  departmentName: string | null
  createdAt: string
}

type Department = {
  id: number
  name: string
}

export default function UserPage() {
  const [openDepartmentForm, setOpenDepartmentForm] = useState(false)
  const [openUserForm, setOpenUserForm] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/department")
      ])

      if (!usersRes.ok || !deptsRes.ok) throw new Error("Failed to fetch data")

      const usersData = await usersRes.json()
      const deptsData = await deptsRes.json()

      setUsers(usersData)
      setDepartments(deptsData)
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstname} ${user.lastname}`.toLowerCase()
    const matchesSearch = fullName.includes(search.toLowerCase()) || 
                         (user.email && user.email.toLowerCase().includes(search.toLowerCase()))
    
    const matchesDept = selectedDept === "all" || String(user.departmentId) === selectedDept

    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collaborators</h1>
          <p className="text-muted-foreground">Manage and view all registered collaborators in the organization.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenDepartmentForm(true)}>
            <Signpost className="mr-2 h-4 w-4" />
            Add Department
          </Button>
          <Button onClick={() => setOpenUserForm(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Collaborator
          </Button>
        </div>
        <DepartmentForm open={openDepartmentForm} onOpenChange={setOpenDepartmentForm} onSuccess={() => {
          fetchData()
          setOpenDepartmentForm(false)
        }} />
        <UserForm 
          open={openUserForm} 
          onOpenChange={(open) => {
            setOpenUserForm(open)
            if (!open) setEditUser(null)
          }} 
          onSuccess={() => {
            fetchData()
            setOpenUserForm(false)
            setEditUser(null)
          }}
          editUser={editUser}
        />
      </div>

      <UserFilterBar 
        search={search}
        onSearchChange={setSearch}
        selectedDept={selectedDept}
        onDeptChange={setSelectedDept}
        departments={departments}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <User className="h-12 w-12 text-muted-foreground opacity-20" />
          </div>
          <h3 className="text-lg font-semibold">No collaborators found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard 
              key={user.id}
              id={user.id}
              firstname={user.firstname}
              lastname={user.lastname}
              email={user.email}
              departmentName={user.departmentName}
              createdAt={user.createdAt}
              onClick={() => {
                setEditUser(user)
                setOpenUserForm(true)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
