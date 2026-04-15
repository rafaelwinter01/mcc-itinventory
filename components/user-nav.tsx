"use client"

import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, KeyRound, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { ChangePasswordForm } from "@/modals/Changepassword-form"
import { PreferencesForm } from "@/modals/Preferences-form"

type UserData = {
  username: string
  firstname: string
  lastname: string
  email: string | null
  role: string
}

export function UserNav() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"

  useEffect(() => {
    if (isPublicRoute) {
      setLoading(false)
      setUserData(null)
      return
    }

    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [isPublicRoute])

  if (isPublicRoute) {
    return null
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const initials = userData 
    ? `${userData.firstname[0]}${userData.lastname[0]}`.toUpperCase()
    : "..."

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-accent hover:bg-accent/80">
          <span className="flex h-full w-full items-center justify-center text-sm font-medium">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userData ? `${userData.firstname} ${userData.lastname}` : "Loading..."}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData?.email || userData?.username || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>Change Password</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setShowPreferences(true)}>
          <User className="mr-2 h-4 w-4" />
          <span>Preferences</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ChangePasswordForm 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />
      <PreferencesForm
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
    </DropdownMenu>
  )
}
