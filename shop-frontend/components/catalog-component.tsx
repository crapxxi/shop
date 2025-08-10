"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { PackageSearch } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { fetchJSON } from "@/lib/api"
import type { ProductListItem } from "@/lib/types"

type ProductSort = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc"

export default function CatalogComponent({
  heading = "Каталог",
  className = "",
}: {
  heading?: string
  className?: string
}) {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<ProductSort>("default")

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetchJSON<ProductListItem[]>("/products")
        if (mounted && Array.isArray(res.data)) setProducts(res.data)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = Array.isArray(products) ? products : []
    if (!query) return list
    return list.filter((p) => p.name.toLowerCase().includes(query))
  }, [q, products])

  const sorted = useMemo(() => {
    const list = [...filtered]
    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price)
      case "price-desc":
        return list.sort((a, b) => b.price - a.price)
      case "name-asc":
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case "name-desc":
        return list.sort((a, b) => b.name.localeCompare(a.name))
      default:
        return list
    }
  }, [filtered, sort])

  return (
    <div className={className}>
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{heading}</h2>
        </div>
        <div className="flex items-center gap-3 w-full md:w-[600px]">
          <div className="relative w-full">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск товаров..."
              aria-label="Поиск товаров"
              className="pl-9"
            />
            <PackageSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Select value={sort} onValueChange={(v: ProductSort) => setSort(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">по умолчанию</SelectItem>
              <SelectItem value="price-asc">цена: по возрастанию</SelectItem>
              <SelectItem value="price-desc">цена: по убыванию</SelectItem>
              <SelectItem value="name-asc">название: A→Я</SelectItem>
              <SelectItem value="name-desc">название: Я→A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="mb-6" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {new Array(6).fill(0).map((_, i) => (
            <Card key={`skeleton-${i}`} className="animate-pulse">
              <div className="aspect-[4/3] bg-muted rounded-t-lg" />
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
              <CardFooter>
                <div className="h-9 bg-muted rounded w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">Ничего не найдено</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map((p) => (
            <Card key={`prod-${p.id}`} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={p.image || "/placeholder.svg?height=400&width=600&query=product image placeholder"}
                  alt={p.name}
                  fill
                  className="object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-semibold">{p.price} ₽</div>
              </CardContent>
              <CardFooter className="gap-2">
                <Link href={`/products/${p.id}`} className="w-full">
                  <Button className="w-full transition active:scale-95">Подробнее</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
