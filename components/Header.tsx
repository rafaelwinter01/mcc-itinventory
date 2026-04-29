"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Evita hydration mismatch
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
    })

    let isMounted = true

    const loadUserRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as { role?: string }
        if (isMounted) {
          setIsAdmin(data.role === "admin")
        }
      } catch (error) {
        console.error("Failed to load user role:", error)
      }
    }

    loadUserRole()

    return () => {
      window.cancelAnimationFrame(frameId)
      isMounted = false
    }
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-24 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Go to main page" className="inline-flex">
            {mounted ? (
              <Image
                src={theme === "dark" ? "/mcc-d.png" : "/mcc-l.png"}
                alt="MCC Logo"
                width={120}
                height={48}
                className="object-contain"
              />
            ) : (
              <div className="w-30 h-12" />
            )}
          </Link>
          <div className="text-xl font-semibold ml-3">IT - Inventory</div>
        </div>
        <div className="flex-1 flex justify-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/workstation">Workstations</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/device">Devices</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/user">Users</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/license">Licenses</Link>
          </Button>
          {isAdmin ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/catalogs">Catalogs</Link>
            </Button>
          ) : null}
        </div>
      <div className="flex items-center gap-2">
        {/* <Settings /> */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="Change Theme"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          ) : (
            <div className="h-5 w-5" />
          )}
        </button>
        <UserNav />
      </div>
      </div>
      
    </header>
  )
}