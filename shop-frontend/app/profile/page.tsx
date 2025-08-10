"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON, clearToken } from "@/lib/api"
import type { Profile } from "@/lib/types"
import { Loader2, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { GlobalTabs } from "@/components/global-tabs"

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchJSON<Profile>("/profile", { auth: true })
        if (res.data) setProfile(res.data)
        if (res.error) toast({ title: "Ошибка", description: res.error, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  function onLogout() {
    setLoggingOut(true)
    setTimeout(() => {
      clearToken()
      setLoggingOut(false)
      toast({ title: "Вы вышли из аккаунта" })
      router.push("/login")
    }, 200)
  }

  return (
    <div className="container px-4 py-6">
      <GlobalTabs className="mb-4" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Информация об учетной записи</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
            </div>
          ) : profile ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Имя пользователя</div>
                  <div className="font-medium">{profile.username}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{profile.email}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-muted-foreground">Роль</div>
                  <Badge variant="secondary" className="font-medium">
                    {profile.role}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">Быстрые действия</div>
                <div className="flex gap-2 flex-wrap">
                  <Link href="/orders">
                    <Button variant="outline" className="bg-transparent transition active:scale-95">
                      Мои заказы
                    </Button>
                  </Link>
                  {profile.role === "admin" && (
                    <Link href="/admin">
                      <Button variant="outline" className="bg-transparent transition active:scale-95">
                        Админ-панель
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Профиль недоступен</div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={loggingOut}
            aria-busy={loggingOut}
            className="gap-2 bg-transparent transition active:scale-95"
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Выйти
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
