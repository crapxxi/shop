"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { OrderDisplay } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function OrderDetailsPage() {
  const params = useParams()
  const id = Number(params?.id)
  const [order, setOrder] = useState<OrderDisplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const { toast } = useToast()

  function canCancel(status?: string) {
    const st = (status || "").toLowerCase()
    return !(
      st.includes("ship") ||
      st.includes("отправ") ||
      st.includes("deliver") ||
      st.includes("done") ||
      st.includes("comp") ||
      st.includes("finish") ||
      st.includes("cancel")
    )
  }

  async function cancelOrder() {
    if (!order) return
    setCanceling(true)
    try {
      const res = await fetchJSON<{ message: string }>("/orders/update", {
        method: "POST",
        auth: true,
        body: { id: order.id, status: "canceled" },
      })
      if (res.data) {
        setOrder({ ...order, status: "canceled" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось отменить", variant: "destructive" })
      }
    } finally {
      setCanceling(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchJSON<OrderDisplay>(`/orders/${id}`, { auth: true })
        if (res.data) setOrder(res.data)
        if (res.error) toast({ title: "Ошибка", description: res.error, variant: "destructive" })
      } catch (e) {
        toast({ title: "Ошибка", description: "Не удалось загрузить заказ", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
  }, [id, toast])

  return (
    <div className="container px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Заказ #{id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : order ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-muted-foreground">Статус:</div>
                <Badge variant="secondary">{order.status}</Badge>
              </div>
              <div>
                Сумма: <span className="font-semibold">{order.total_price} ₽</span>
              </div>
              <div>Создан: {new Date(order.created_at as any as string).toLocaleString()}</div>
              <div className="pt-2">
                <Button
                  variant="destructive"
                  onClick={cancelOrder}
                  disabled={!canCancel(order?.status) || canceling}
                  aria-busy={canceling}
                  className="w-full sm:w-auto transition active:scale-95"
                >
                  {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отменить заказ"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Заказ не найден</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
