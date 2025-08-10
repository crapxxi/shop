"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { CartDisplay } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { GlobalTabs } from "@/components/global-tabs"

export default function CheckoutPage() {
  const [items, setItems] = useState<CartDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchJSON<CartDisplay[]>("/cart/", { auth: true })
        if (Array.isArray(res.data)) setItems(res.data)
        else setItems([])
      } catch {
        toast({ title: "Ошибка", description: "Не удалось загрузить корзину", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const total = useMemo(() => {
    const list = Array.isArray(items) ? items : []
    return list.reduce((sum, it) => {
      const price =
        typeof it.product_price === "string" ? Number.parseInt(it.product_price) : (it.product_price as any as number)
      return sum + (isNaN(price) ? 0 : price) * it.quantity
    }, 0)
  }, [items])

  async function placeOrder() {
    setPlacing(true)
    try {
      const res = await fetchJSON<{ message: string }>("/orders/", {
        method: "POST",
        auth: true,
        body: {
          status: "pending",
          total_price: total,
          created_at: new Date().toISOString(),
        },
      })
      if (res.data) {
        await fetchJSON("/cart/clear", { method: "DELETE", auth: true })
        toast({ title: "Заказ создан" })
        router.push("/orders")
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось создать заказ", variant: "destructive" })
      }
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div>
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>
      <div className="container px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Оформление заказа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="text-muted-foreground">Загрузка...</div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground">Корзина пуста</div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => {
                  const price =
                    typeof it.product_price === "string"
                      ? Number.parseInt(it.product_price)
                      : (it.product_price as any as number)
                  return (
                    <div key={it.id} className="flex items-center justify-between">
                      <div className="text-sm">
                        {it.product_name} × {it.quantity}
                      </div>
                      <div className="font-medium">{isNaN(price) ? "-" : `${price * it.quantity} ₽`}</div>
                    </div>
                  )
                })}
                <Separator />
                <div className="flex items-center justify-between text-lg font-semibold">
                  <div>Итого</div>
                  <div>{total} ₽</div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={placeOrder}
              disabled={items.length === 0 || placing}
              aria-busy={placing}
              className="transition active:scale-95"
            >
              {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Создать заказ"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
