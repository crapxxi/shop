"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getBaseUrl, setBaseUrl, fetchJSON } from "@/lib/api"
import type { Profile } from "@/lib/types"
import { Loader2, ShieldAlert } from "lucide-react"
import { GlobalTabs } from "@/components/global-tabs"

export default function SettingsPage() {
  const { toast } = useToast()
  const [url, setUrl] = useState(getBaseUrl())
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      setChecking(true)
      const prof = await fetchJSON<Profile>("/profile", { auth: true })
      setIsAdmin(prof.data?.role === "admin")
      setChecking(false)
    }
    check()
  }, [])

  function save() {
    setBaseUrl(url)
    toast({ title: "API URL сохранён", description: url })
    router.push("/")
  }

  if (checking) {
    return (
      <>
        <div className="container px-4 py-2">
          <GlobalTabs />
        </div>
        <div className="min-h-[60vh] grid place-items-center px-4 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <div className="container px-4 py-2">
          <GlobalTabs />
        </div>
        <div className="min-h-[60vh] grid place-items-center px-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Доступ запрещён
              </CardTitle>
              <CardDescription>Страница настроек доступна только администраторам.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => router.push("/")} className="transition active:scale-95">
                На главную
              </Button>
            </CardFooter>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>
      <div className="min-h-[60vh] grid place-items-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Настройки API</CardTitle>
            <CardDescription>Укажите адрес вашего Go API (например: http://localhost:8080)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://shop-4dv1.onrender.com" />
          </CardContent>
          <CardFooter>
            <Button onClick={save} className="w-full transition active:scale-95">
              Сохранить
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  )
}
