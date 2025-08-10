"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { fetchJSON } from "@/lib/api"
import { Plus, Trash2, Copy, Loader2, UploadCloud, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

type NewProduct = Omit<Product, "id">

type BuilderItem = NewProduct & {
  _key: string
  _errors?: Partial<Record<keyof NewProduct, string>>
}

function makeEmpty(idx: number): BuilderItem {
  return {
    _key: `p-${Date.now()}-${idx}`,
    name: "",
    description: "",
    price: 0,
    stock: 0,
    image: "",
  }
}

function sanitizeNumber(v: any, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function validateItem(p: BuilderItem): BuilderItem {
  const errors: BuilderItem["_errors"] = {}
  if (!p.name.trim()) errors.name = "Укажите название"
  if (!Number.isFinite(p.price) || p.price <= 0) errors.price = "Цена должна быть > 0"
  if (!Number.isFinite(p.stock) || p.stock < 0) errors.stock = "Остаток не может быть отрицательным"
  return { ...p, _errors: Object.keys(errors).length ? errors : undefined }
}

function toPayload(items: BuilderItem[]): NewProduct[] {
  return items.map(({ _key, _errors, ...rest }) => rest)
}

export default function BulkProductsBuilder({ onPosted = () => {} }: { onPosted?: () => void }) {
  const { toast } = useToast()
  const [items, setItems] = useState<BuilderItem[]>([makeEmpty(0)])
  const [posting, setPosting] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState("")

  const validItems = useMemo(() => items.map(validateItem), [items])
  const hasErrors = useMemo(() => validItems.some((i) => i._errors), [validItems])
  const jsonPreview = useMemo(() => JSON.stringify(toPayload(validItems), null, 2), [validItems])

  function addOne() {
    setItems((prev) => [...prev, makeEmpty(prev.length)])
  }

  function addFive() {
    setItems((prev) => [
      ...prev,
      makeEmpty(prev.length),
      makeEmpty(prev.length + 1),
      makeEmpty(prev.length + 2),
      makeEmpty(prev.length + 3),
      makeEmpty(prev.length + 4),
    ])
  }

  function duplicateAt(i: number) {
    setItems((prev) => {
      const src = prev[i]
      const copy: BuilderItem = {
        ...src,
        _key: `copy-${src._key}-${Date.now()}`,
      }
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return next
    })
  }

  function removeAt(i: number) {
    setItems((prev) => (prev.length <= 1 ? [makeEmpty(0)] : prev.filter((_, idx) => idx !== i)))
  }

  function clearAll() {
    setItems([makeEmpty(0)])
  }

  function updateAt(i: number, field: keyof NewProduct, value: any) {
    setItems((prev) => {
      const next = [...prev]
      const target = { ...next[i] }
      if (field === "price" || field === "stock") {
        target[field] = sanitizeNumber(value, field === "price" ? 0 : 0)
      } else {
        target[field] = value as any
      }
      next[i] = target
      return next
    })
  }

  function parsePaste() {
    try {
      const arr = JSON.parse(pasteText)
      if (!Array.isArray(arr)) {
        toast({ title: "Ожидался массив JSON", variant: "destructive" })
        return
      }
      const mapped: BuilderItem[] = arr.map((raw: any, idx: number) => ({
        _key: `paste-${Date.now()}-${idx}`,
        name: String(raw?.name ?? ""),
        description: String(raw?.description ?? ""),
        price: sanitizeNumber(raw?.price, 0),
        stock: sanitizeNumber(raw?.stock, 0),
        image: String(raw?.image ?? ""),
      }))
      setItems((prev) => (prev.length === 1 && !prev[0].name && prev[0].price === 0 ? mapped : [...prev, ...mapped]))
      setShowPaste(false)
      setPasteText("")
      toast({ title: "Импортировано", description: `${mapped.length} шт.` })
    } catch (e: any) {
      toast({ title: "Ошибка JSON", description: e?.message || "", variant: "destructive" })
    }
  }

  async function postAll() {
    const checked = validItems.map(validateItem)
    const errCount = checked.reduce((n, it) => n + (it._errors ? 1 : 0), 0)
    if (errCount > 0) {
      setItems(checked)
      toast({
        title: "Заполните обязательные поля",
        description: "Проверьте выделенные строки",
        variant: "destructive",
      })
      return
    }
    setPosting(true)
    try {
      const payload = toPayload(checked)
      const res = await fetchJSON<{ message: string }>("/products", { method: "POST", auth: true, body: payload })
      if (res.data) {
        toast({ title: "Товары добавлены", description: `${payload.length} шт.` })
        setItems([makeEmpty(0)])
        onPosted()
      } else {
        toast({ title: "Ошибка", description: res.error || "Не удалось добавить товары", variant: "destructive" })
      }
    } catch (e: any) {
      toast({ title: "Ошибка сети", description: e?.message || "", variant: "destructive" })
    } finally {
      setPosting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Добавление товаров (конструктор)</span>
          <span className="text-sm text-muted-foreground">Позиций: {items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button className="transition active:scale-95" size="sm" onClick={addOne}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить позицию
          </Button>
          <Button className="transition active:scale-95" size="sm" variant="secondary" onClick={addFive}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить 5
          </Button>
          <Button
            className="transition active:scale-95 bg-transparent"
            size="sm"
            variant="outline"
            onClick={() => setShowPaste((s) => !s)}
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Вставить JSON
          </Button>
          <Button className="transition active:scale-95" size="sm" variant="ghost" onClick={clearAll}>
            Очистить
          </Button>
        </div>

        {showPaste && (
          <div className="space-y-2">
            <Label>JSON массив товаров</Label>
            <Textarea
              rows={6}
              placeholder='[{"name":"Item","description":"...","price":1000,"stock":5,"image":""}]'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" className="transition active:scale-95" onClick={parsePaste}>
                Импортировать
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="transition active:scale-95 bg-transparent"
                onClick={() => setShowPaste(false)}
              >
                Отмена
              </Button>
            </div>
            <Separator />
          </div>
        )}

        <div className="space-y-4">
          {validItems.map((it, i) => {
            const err = it._errors || {}
            return (
              <div key={it._key} className="rounded-lg border p-3 md:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">Поз. #{i + 1}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="transition active:scale-95"
                      onClick={() => duplicateAt(i)}
                      title="Дублировать"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Дублировать
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="transition active:scale-95"
                      onClick={() => removeAt(i)}
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Название</Label>
                    <Input
                      value={it.name}
                      onChange={(e) => updateAt(i, "name", e.target.value)}
                      className={cn(err.name ? "border-red-500" : "")}
                      placeholder="Напр. Футболка"
                    />
                    {err.name && <p className="text-xs text-red-600">{err.name}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Цена</Label>
                    <Input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateAt(i, "price", e.target.value)}
                      className={cn(err.price ? "border-red-500" : "")}
                      min={0}
                    />
                    {err.price && <p className="text-xs text-red-600">{err.price}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Остаток</Label>
                    <Input
                      type="number"
                      value={it.stock}
                      onChange={(e) => updateAt(i, "stock", e.target.value)}
                      className={cn(err.stock ? "border-red-500" : "")}
                      min={0}
                    />
                    {err.stock && <p className="text-xs text-red-600">{err.stock}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Изображение (URL)</Label>
                    <Input
                      value={it.image}
                      onChange={(e) => updateAt(i, "image", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2 grid gap-2">
                    <Label>Описание</Label>
                    <Textarea
                      rows={3}
                      value={it.description}
                      onChange={(e) => updateAt(i, "description", e.target.value)}
                      placeholder="Краткое описание товара"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="preview">
            <AccordionTrigger className="text-sm">
              <FileText className="w-4 h-4 mr-2" />
              Предпросмотр JSON
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs whitespace-pre-wrap break-words">{jsonPreview}</pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Готово к отправке: {validItems.length} {hasErrors ? "(есть ошибки)" : ""}
        </div>
        <Button onClick={postAll} disabled={posting} aria-busy={posting} className="transition active:scale-95">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
          Отправить на сервер
        </Button>
      </CardFooter>
    </Card>
  )
}
