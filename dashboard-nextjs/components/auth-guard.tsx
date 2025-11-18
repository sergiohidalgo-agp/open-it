"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar autenticación
    const checkAuth = () => {
      const authenticated = localStorage.getItem("isAuthenticated") === "true"

      if (!authenticated && pathname !== "/login") {
        router.push("/login")
      } else if (authenticated && pathname === "/login") {
        router.push("/")
      } else {
        setIsAuthenticated(true)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated && pathname !== "/login") {
    return null
  }

  return <>{children}</>
}
