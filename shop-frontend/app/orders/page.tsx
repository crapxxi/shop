"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { OrderDisplay } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { GlobalTabs } from "@/components/global-tabs"

function StatusBadge({ status }: { status: string }) {
  const st = status?.toLowerCase?.() || ""
  const color = st.includes("pend")
    ? "bg-amber-100 text-amber-800"
    : st.includes("done") || st.includes("comp")
      ? "bg-emerald-100 text-emerald-800"
      : st.includes("cancel")
        ? "bg-rose-100 text-rose-800"
        : "bg-gray-100 text-gray-800"
  return (
    <Badge className={color + " font-medium"} variant="secondary">
      {status}
    </Badge>
  )
}

type StatusFilter = "all" | "pending" | "processing" | "shipping" | "shipped" | "completed" | "canceled"

const statusOrder = ["pending", "processing", "shipping", "shipped", "completed", "canceled"]

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const res = await fetchJSON<OrderDisplay[]>("/orders/", { auth: true })
      if (Array.isArray(res.data)) setOrders(res.data)
      else setOrders([])
      if (res.error) toast({ title: "Ошибка", description: res.error, variant: "destructive" })
      setLoading(false)
    }
    load()
  }, [toast])

  function canCancel(status: string) {
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

  async function cancelOrder(id: number) {
    setCancelingId(id)
    try {
      const res = await fetchJSON<{ message: string }>("/orders/update", {
        method: "POST",
        auth: true,
        body: { id, status: "canceled" },
      })
      if (res.data) {
        setOrders((prev) =>
          Array.isArray(prev) ? prev.map((o) => (o.id === id ? { ...o, status: "canceled" } : o)) : prev,
        )
        toast({ title: "Заказ отменён" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось отменить заказ", variant: "destructive" })
      }
    } finally {
      setCancelingId(null)
    }
  }

  const list = useMemo(() => {
    const arr = Array.isArray(orders) ? orders : []
    const filtered = filter === "all" ? arr : arr.filter((o) => (o.status || "").toLowerCase().includes(filter))
    const sorted = [...filtered].sort((a, b) => {
      const sa = statusOrder.findIndex((s) => (a.status || "").toLowerCase().includes(s))
      const sb = statusOrder.findIndex((s) => (b.status || "").toLowerCase().includes(s))
      return (sa === -1 ? 999 : sa) - (sb === -1 ? 999 : sb)
    })
    return sorted
  }, [orders, filter])

  return (
    <div className="container px-4 py-6">
      <GlobalTabs className="mb-4" />

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Мои заказы</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: StatusFilter) => setFilter(v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="processing">processing</SelectItem>
                <SelectItem value="shipping">shipping</SelectItem>
                <SelectItem value="shipped">shipped</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="canceled">canceled</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/" className="hidden" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Загрузка...</div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground">Заказов пока нет</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((o) => (
                    <TableRow key={`order-${o.id}`}>
                      <TableCell>
                        <Link className="underline" href={`/orders/${o.id}`}>
                          {o.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>{o.total_price} ₽</TableCell>
                      <TableCell>{new Date((o as any).created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelOrder(o.id)}
                          disabled={!canCancel(o.status) || cancelingId === o.id}
                          aria-busy={cancelingId === o.id}
                          className="transition active:scale-95"
                        >
                          {cancelingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отменить"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
