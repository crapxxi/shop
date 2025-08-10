"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchJSON, getToken } from "@/lib/api"
import type { Profile } from "@/lib/types"

type TabKey = "catalog" | "orders" | "profile" | "cart" | "admin" | "admin-orders" | "settings"

const routeByTab: Record<TabKey, string> = {
  catalog: "/",
  orders: "/orders",
  profile: "/profile",
  cart: "/cart",
  admin: "/admin",
  "admin-orders": "/admin/orders",
  settings: "/settings",
}

function currentTabFromPath(path: string | null): TabKey {
  const p = (path || "/").toLowerCase()
  if (p.startsWith("/orders")) return "orders"
  if (p.startsWith("/profile")) return "profile"
  if (p.startsWith("/cart")) return "cart"
  if (p === "/admin/orders" || p.startsWith("/admin/orders")) return "admin-orders"
  if (p.startsWith("/admin")) return "admin"
  if (p.startsWith("/settings")) return "settings"
  // product details and /products alias considered catalog
  return "catalog"
}

export function GlobalTabs({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  const value = useMemo(() => currentTabFromPath(pathname), [pathname])

  useEffect(() => {
    // Check role only when authenticated to avoid unnecessary calls
    const token = getToken()
    if (!token) {
      setIsAdmin(false)
      return
    }
    let ignore = false
    ;(async () => {
      const res = await fetchJSON<Profile>("/profile", { auth: true })
      if (!ignore) setIsAdmin(res.data?.role === "admin")
    })()
    return () => {
      ignore = true
    }
  }, [pathname])

  function onValueChange(next: string) {
    const key = next as TabKey
    const href = routeByTab[key]
    if (href) router.push(href)
  }

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="catalog">Каталог</TabsTrigger>
        <TabsTrigger value="orders">Заказы</TabsTrigger>
        <TabsTrigger value="profile">Профиль</TabsTrigger>
        <TabsTrigger value="cart">Корзина</TabsTrigger>
        {isAdmin && (
          <>
            <TabsTrigger value="admin">Админ</TabsTrigger>
            <TabsTrigger value="admin-orders">Все заказы</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </>
        )}
      </TabsList>
    </Tabs>
  )
}
