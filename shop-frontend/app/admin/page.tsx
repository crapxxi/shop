"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import type { Product, ProductListItem, Profile } from "@/lib/types"
import { Loader2 } from "lucide-react"
import BulkProductsBuilder from "@/components/admin/bulk-products-builder"
import { GlobalTabs } from "@/components/global-tabs"

export default function AdminPage() {
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [edit, setEdit] = useState<Partial<Product> & { id?: number }>({})
  const [updateLoading, setUpdateLoading] = useState(false)
  const [orderUpdating, setOrderUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const prof = await fetchJSON<Profile>("/profile", { auth: true })
        if (prof.data) setProfile(prof.data)
        if (prof.error) throw new Error(prof.error)
        const list = await fetchJSON<ProductListItem[]>("/products")
        if (list.data) setProducts(list.data)
      } catch (e: any) {
        toast({ title: "Ошибка", description: e?.message || "Нет доступа", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [toast])

  async function refreshProducts() {
    const list = await fetchJSON<ProductListItem[]>("/products")
    if (list.data) setProducts(list.data)
  }

  async function updateProduct() {
    setUpdateLoading(true)
    try {
      if (!edit.id) {
        toast({ title: "Укажите ID товара", variant: "destructive" })
        return
      }
      const res = await fetchJSON<{ message: string }>(`/products/${edit.id}`, {
        method: "PUT",
        auth: true,
        body: {
          name: edit.name || "",
          description: edit.description || "",
          price: edit.price || 0,
          stock: edit.stock || 0,
          image: edit.image || "",
        },
      })
      if (res.data) {
        toast({ title: "Товар обновлён" })
        refreshProducts()
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось обновить", variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" })
    } finally {
      setUpdateLoading(false)
    }
  }

  async function deleteProduct(id: number) {
    setDeletingId(id)
    try {
      const res = await fetchJSON<{ message: string }>(`/products/${id}`, { method: "DELETE", auth: true })
      if (res.data) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
        toast({ title: "Удалено" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось удалить", variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  const [orderId, setOrderId] = useState<number | "">("")
  const [orderStatus, setOrderStatus] = useState("processing")

  async function updateOrderStatus() {
    setOrderUpdating(true)
    try {
      if (!orderId) {
        toast({ title: "Укажите ID заказа", variant: "destructive" })
        return
      }
      const res = await fetchJSON<{ message: string }>("/orders/update", {
        method: "POST",
        auth: true,
        body: { id: Number(orderId), status: orderStatus },
      })
      if (res.data) {
        toast({ title: "Статус заказа обновлён" })
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось обновить", variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message, variant: "destructive" })
    } finally {
      setOrderUpdating(false)
    }
  }

  if (loading) {
    return <div className="container px-4 py-6 text-muted-foreground">Загрузка...</div>
  }

  if (!profile || profile.role !== "admin") {
    return <div className="container px-4 py-6 text-muted-foreground">Доступ только для администраторов</div>
  }

  return (
    <>
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>

      <div className="container px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link href="/admin/orders" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full transition active:scale-95 bg-transparent">
              Все заказы
            </Button>
          </Link>
        </div>

        <BulkProductsBuilder onPosted={refreshProducts} />

        <Card>
          <CardHeader>
            <CardTitle>Обновить товар</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>ID</Label>
              <Input
                type="number"
                value={edit.id ?? ""}
                onChange={(e) => setEdit((p) => ({ ...p, id: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Название</Label>
              <Input value={edit.name ?? ""} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Описание</Label>
              <Input
                value={edit.description ?? ""}
                onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Цена</Label>
              <Input
                type="number"
                value={edit.price ?? 0}
                onChange={(e) => setEdit((p) => ({ ...p, price: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Остаток</Label>
              <Input
                type="number"
                value={edit.stock ?? 0}
                onChange={(e) => setEdit((p) => ({ ...p, stock: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ссылка на изображение</Label>
              <Input value={edit.image ?? ""} onChange={(e) => setEdit((p) => ({ ...p, image: e.target.value }))} />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={updateProduct}
              disabled={updateLoading}
              aria-busy={updateLoading}
              className="transition active:scale-95"
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Обновить статус заказа</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>ID заказа</Label>
              <Input
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : "")}
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Статус</Label>
              <Input
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                placeholder="например: processing | completed | canceled"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={updateOrderStatus}
              disabled={orderUpdating}
              aria-busy={orderUpdating}
              className="transition active:scale-95"
            >
              {orderUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Обновить статус"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Товары (быстрое удаление)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const busy = deletingId === p.id
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.id}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.price} ₽</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProduct(p.id)}
                            disabled={busy}
                            aria-busy={busy}
                            className="transition active:scale-95"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Удалить"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
