import { redirect } from "next/navigation"

export default function ProductsIndex() {
  // Делаем /products удобным алиасом каталога
  redirect("/")
}
