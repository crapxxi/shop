"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { CartDisplay, Profile } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GlobalTabs } from "@/components/global-tabs"

export default function CartPage() {
  const [items, setItems] = useState<CartDisplay[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [status, setStatus] = useState<number>(0)
  const [raw, setRaw] = useState<string>("")
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function load() {
    setLoading(true)
    setAuthRequired(false)
    setStatus(0)
    setRaw("")
    try {
      const prof = await fetchJSON<Profile>("/profile", { auth: true })
      if (prof.status === 401) {
        setAuthRequired(true)
        setProfile(null)
        setItems([])
        setLoading(false)
        return
      }
      if (prof.data) setProfile(prof.data)

      const res = await fetchJSON<CartDisplay[]>("/cart/", { auth: true })
      setStatus(res.status)
      setRaw(JSON.stringify(res.data ?? res.error ?? null, null, 2))

      if (res.status === 401) {
        setAuthRequired(true)
        setItems([])
        setLoading(false)
        return
      }
      if (Array.isArray(res.data)) setItems(res.data)
      else setItems([])
    } catch (e: any) {
      setItems([])
      setRaw(e?.message || "Network error")
      setStatus(0)
      toast({ title: "Ошибка", description: e?.message || "Не удалось загрузить корзину", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    return list.reduce((sum, it) => {
      const price =
        typeof it.product_price === "string" ? Number.parseInt(it.product_price) : (it.product_price as any as number)
      return sum + (isNaN(price) ? 0 : price) * it.quantity
    }, 0)
  }, [items])

  async function removeItem(id: number) {
    setRemovingId(id)
    try {
      const res = await fetchJSON<{ message: string }>("/cart/remove", {
        method: "POST",
        auth: true,
        body: { id },
      })
      if (res.status === 401) {
        setAuthRequired(true)
        return
      }
      if (res.data) {
        setItems((prev) => prev.filter((i) => i.id !== id))
        toast({ title: "Удалено" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось удалить", variant: "destructive" })
      }
    } finally {
      setRemovingId(null)
    }
  }

  async function clearCart() {
    setClearing(true)
    try {
      const res = await fetchJSON<{ message: string }>("/cart/clear", { method: "DELETE", auth: true })
      if (res.status === 401) {
        setAuthRequired(true)
        return
      }
      if (res.data) {
        setItems([])
        toast({ title: "Корзина очищена" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось очистить", variant: "destructive" })
      }
    } finally {
      setClearing(false)
    }
  }

  const isTrulyEmpty = status === 200 && Array.isArray(items) && items.length === 0

  return (
    <div className="container px-4 py-6 space-y-4">
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>
      {authRequired && (
        <Alert variant="default">
          <AlertTitle>Требуется вход</AlertTitle>
          <AlertDescription className="space-y-2">Авторизуйтесь, чтобы увидеть свою корзину.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Корзина{profile?.username ? ` пользователя ${profile.username}` : ""}</CardTitle>
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={items.length === 0 || loading || clearing}
            className="transition active:scale-95 bg-transparent"
            aria-busy={clearing}
            title="Очистить корзину"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Очистить"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : isTrulyEmpty ? (
            <div className="text-muted-foreground">
              Корзина пуста для пользователя {profile?.username || "—"}.{" "}
              <Link className="underline" href="/">
                Перейти к покупкам
              </Link>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Кол-во</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const price =
                      typeof it.product_price === "string"
                        ? Number.parseInt(it.product_price)
                        : (it.product_price as any as number)
                    const busy = removingId === it.id
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.product_name}</TableCell>
                        <TableCell>{isNaN(price) ? "-" : `${price} ₽`}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(it.id)}
                            disabled={busy}
                            aria-busy={busy}
                            className="transition active:scale-95"
                            title="Удалить"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <Separator />
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-semibold">Итого: {total} ₽</div>
          <Link href="/checkout" className="w-full sm:w-auto">
            <Button disabled={items.length === 0} className="w-full transition active:scale-95">
              Оформить заказ
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
