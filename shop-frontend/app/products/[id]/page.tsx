"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON, getToken } from "@/lib/api"
import type { Product } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { GlobalTabs } from "@/components/global-tabs"

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const id = Number(params?.id)

  useEffect(() => {
    const mounted = true
    async function load() {
      try {
        const res = await fetchJSON<Product>(`/products/${id}`)
        if (mounted && res.data) setProduct(res.data)
      } catch {
        toast({ title: "Ошибка", description: "Не удалось загрузить товар", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    if (id) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addToCart() {
    if (!getToken()) {
      toast({
        title: "Требуется вход",
        description: "Авторизуйтесь, чтобы добавлять в корзину",
        variant: "destructive",
      })
      router.push("/login")
      return
    }
    if (!product) return
    const safeQty = Math.max(1, Math.min(Number.isFinite(qty) ? Math.floor(qty) : 1, product.stock || 99))
    setQty(safeQty)
    setAdding(true)
    try {
      const res = await fetchJSON<{ message: string }>("/cart/add", {
        method: "POST",
        auth: true,
        body: [{ product_id: id, quantity: safeQty }],
      })
      if (res.data) toast({ title: "Добавлено в корзину" })
      else toast({ title: "Не удалось добавить", description: res.error || "", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <div className="container px-4 py-2">
        <GlobalTabs />
      </div>
      <div className="container px-4 py-6">
        <Link href="/" className="text-sm underline">
          ← Назад к каталогу
        </Link>
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {product && (
              <Image
                src={product.image || "/placeholder.svg?height=800&width=800&query=product detail image placeholder"}
                alt={product.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{loading ? "Загрузка..." : product?.name}</CardTitle>
              <CardDescription className="text-base">{loading ? "" : product?.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loading && (
                <>
                  <div className="text-2xl font-bold">{product?.price} ₽</div>
                  <div className="text-sm text-muted-foreground">В наличии: {product?.stock}</div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={product?.stock || 99}
                      value={qty}
                      onChange={(e) => {
                        const val = Math.floor(Number(e.target.value))
                        const clamped = Math.max(1, Math.min(Number.isFinite(val) ? val : 1, product?.stock || 99))
                        setQty(clamped)
                      }}
                      className="w-24"
                    />
                    <Button
                      onClick={addToCart}
                      className="flex-1 transition active:scale-95"
                      disabled={adding || (product?.stock ?? 0) <= 0}
                      aria-busy={adding}
                    >
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Добавить в корзину"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
