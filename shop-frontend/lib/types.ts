export type Profile = {
  username: string
  email: string
  role: string
}

export type Product = {
  id: number
  name: string
  description: string
  price: number
  stock: number
  image: string
}

export type ProductListItem = {
  id: number
  name: string
  price: number
  image: string
}

export type CartDisplay = {
  id: number
  product_name: string
  product_price: string | number
  quantity: number
}

export type OrderDisplay = {
  id: number
  status: string
  total_price: number
  created_at: string | Date
}
