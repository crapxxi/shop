"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { OrderDisplay, Profile } from "@/lib/types"
import { Loader2, RefreshCw } from "lucide-react"
import { GlobalTabs } from "@/components/global-tabs"

function StatusBadge({ status }: { status: string }) {
  const st = status?.toLowerCase?.() || ""
  const color = st.includes("pend")
    ? "bg-amber-100 text-amber-800"
    : st.includes("ship")
      ? "bg-blue-100 text-blue-800"
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

const statusOrder = ["pending", "processing", "shipping", "shipped", "completed", "canceled"]

export default function AdminOrdersPage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<OrderDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [statusDraft, setStatusDraft] = useState<Record<number, string>>({})
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<
    "all" | "pending" | "processing" | "shipping" | "shipped" | "completed" | "canceled"
  >("all")

  useEffect(() => {
    async function init() {
      try {
        const prof = await fetchJSON<Profile>("/profile", { auth: true })
        if (prof.data) setProfile(prof.data)
        if (prof.error) throw new Error(prof.error)
        await loadOrders()
      } catch (e: any) {
        toast({ title: "Ошибка", description: e?.message || "Нет доступа", variant: "destructive" })
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      let res = await fetchJSON<any[]>("/orders/getall", { auth: true })
      if (!Array.isArray(res.data)) {
        res = await fetchJSON<any[]>("/orders/all", { auth: true })
      }
      if (!Array.isArray(res.data)) {
        res = await fetchJSON<any[]>("/orders/", { auth: true })
      }
      const raw = Array.isArray(res.data) ? res.data : []
      const list: OrderDisplay[] = raw.map((o: any, idx: number) => {
        const idRaw = o?.id ?? o?.ID ?? o?.order_id ?? o?.OrderID ?? o?.Order_id ?? idx + 1
        const created = o?.created_at ?? o?.CreatedAt ?? o?.created ?? new Date().toISOString()
        const total = Number.isFinite(Number(o?.total_price ?? o?.TotalPrice ?? o?.total ?? 0))
          ? Number(o?.total_price ?? o?.TotalPrice ?? o?.total ?? 0)
          : 0
        return {
          id: Number(idRaw),
          status: String(o?.status ?? o?.Status ?? ""),
          total_price: total,
          created_at: created,
        }
      })
      setOrders(list)
      if (res.error) toast({ title: "Ошибка", description: res.error, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let list = Array.isArray(orders) ? orders : []
    if (filter !== "all") {
      list = list.filter((o) => (o.status || "").toLowerCase().includes(filter))
    }
    if (query) {
      list = list.filter((o) => String(o.id).includes(query) || (o.status || "").toLowerCase().includes(query))
    }
    // сортировка по статусу
    list = [...list].sort((a, b) => {
      const sa = statusOrder.findIndex((s) => (a.status || "").toLowerCase().includes(s))
      const sb = statusOrder.findIndex((s) => (b.status || "").toLowerCase().includes(s))
      return (sa === -1 ? 999 : sa) - (sb === -1 ? 999 : sb)
    })
    return list
  }, [orders, q, filter])

  async function saveStatus(id: number) {
    const nextStatus = statusDraft[id]
    if (!nextStatus) {
      toast({ title: "Укажите статус", variant: "destructive" })
      return
    }
    setSavingId(id)
    try {
      const res = await fetchJSON<{ message: string }>("/orders/update", {
        method: "POST",
        auth: true,
        body: { id, status: nextStatus },
      })
      if (res.data) {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)))
        toast({ title: "Статус обновлён" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось обновить", variant: "destructive" })
      }
    } finally {
      setSavingId(null)
    }
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
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "canceled" } : o)))
        toast({ title: "Заказ отменён" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось отменить", variant: "destructive" })
      }
    } finally {
      setCancelingId(null)
    }
  }

  if (!profile || profile.role !== "admin") {
    return <div className="container px-4 py-6 text-muted-foreground">Доступ только для администраторов</div>
  }

  return (
    <>
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>
      <div className="container px-4 py-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Все заказы</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Фильтр по ID или статусу..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full sm:w-[260px]"
              />
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="processing">processing</SelectItem>
                  <SelectItem value="shipping">shipping</SelectItem>
                  <SelectItem value="shipped">shipped</SelectItem>
                  <SelectItem value="completed">completed</SelectItem>
                  <SelectItem value="canceled">canceled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadOrders} className="transition active:scale-95 bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-muted-foreground">Нет заказов</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => {
                      const saving = savingId === o.id
                      const canceling = cancelingId === o.id
                      return (
                        <TableRow key={o.id}>
                          <TableCell>{o.id}</TableCell>
                          <TableCell className="space-y-2">
                            <StatusBadge status={o.status} />
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <Select
                                value={statusDraft[o.id] ?? o.status}
                                onValueChange={(v) => setStatusDraft((p) => ({ ...p, [o.id]: v }))}
                              >
                                <SelectTrigger className="h-8 w-[180px]">
                                  <SelectValue placeholder="Статус" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">pending</SelectItem>
                                  <SelectItem value="processing">processing</SelectItem>
                                  <SelectItem value="shipping">shipping</SelectItem>
                                  <SelectItem value="shipped">shipped</SelectItem>
                                  <SelectItem value="completed">completed</SelectItem>
                                  <SelectItem value="canceled">canceled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => saveStatus(o.id)}
                                disabled={saving}
                                aria-busy={saving}
                                className="transition active:scale-95"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{o.total_price} ₽</TableCell>
                          <TableCell>{new Date((o as any).created_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelOrder(o.id)}
                              disabled={!canCancel(o.status) || canceling}
                              aria-busy={canceling}
                              className="transition active:scale-95"
                            >
                              {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отменить"}
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
        </Card>
      </div>
    </>
  )
}
