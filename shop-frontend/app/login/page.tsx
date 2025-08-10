"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { setToken, fetchJSON } from "@/lib/api"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [nameOrEmail, setNameOrEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetchJSON<{ token: string }>("/login", {
        method: "POST",
        body: { nameoremail: nameOrEmail, password },
      })
      if (res.data?.token) {
        setToken(res.data.token) // теперь в cookie
        toast({ title: "Успешный вход" })
        router.push("/profile")
      } else {
        toast({ title: "Ошибка входа", description: res.error || "Проверьте данные", variant: "destructive" })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] grid place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Авторизуйтесь, чтобы управлять корзиной и заказами.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login">Имя пользователя или Email</Label>
              <Input id="login" required value={nameOrEmail} onChange={(e) => setNameOrEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} aria-busy={loading} className="transition active:scale-95">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Войти"}
            </Button>
            <div className="text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link className="underline" href="/register">
                Регистрация
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
