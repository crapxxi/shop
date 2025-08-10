const TOKEN_COOKIE = "auth_token"
const LEGACY_TOKEN_KEY = "auth_token"
const BASE_KEY = "api_base_url"
const DEFAULT_BASE = "http://localhost:8080"

function sanitizeBaseUrl(input: string | null | undefined): string {
  let url = (input || "").trim()
  if (!url) return DEFAULT_BASE
  if (!/^https?:\/\//i.test(url)) {
    url = "http://" + url
  }
  url = url.replace(/\/+$/, "")
  return url
}

function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const b = base.replace(/\/+$/, "")
  const p = path.startsWith("/") ? path : "/" + path
  return b + p
}

// Cookie helpers
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1]
  return value ? decodeURIComponent(value) : null
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
  const maxAge = days > 0 ? `; Max-Age=${days * 24 * 60 * 60}` : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}${maxAge}`
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function getToken(): string | null {
  const fromCookie = getCookie(TOKEN_COOKIE)
  if (fromCookie) return fromCookie
  // Миграция: если токен лежит в localStorage — перенесём его в cookie и удалим из LS
  if (typeof window !== "undefined") {
    try {
      const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
      if (legacy) {
        setCookie(TOKEN_COOKIE, legacy, 7)
        localStorage.removeItem(LEGACY_TOKEN_KEY)
        return legacy
      }
    } catch {
      // ignore
    }
  }
  return null
}

export function setToken(token: string) {
  setCookie(TOKEN_COOKIE, token, 7)
}

export function clearToken() {
  deleteCookie(TOKEN_COOKIE)
}

export function getBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE
  try {
    const fromLS = localStorage.getItem(BASE_KEY)
    return sanitizeBaseUrl(fromLS || DEFAULT_BASE)
  } catch {
    return DEFAULT_BASE
  }
}

export function setBaseUrl(url: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(BASE_KEY, url)
  } catch {
    // ignore
  }
}

type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  auth?: boolean
  body?: any
  headers?: Record<string, string>
}

export async function fetchJSON<T = any>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ data?: T; error?: string; status: number }> {
  const base = getBaseUrl()
  const url = joinUrl(base, path)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  }
  if (opts.auth) {
    const token = getToken()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "omit",
    })

    const status = res.status
    const isJSON = res.headers.get("content-type")?.includes("application/json")

    if (!res.ok) {
      let message = res.statusText
      try {
        if (isJSON) {
          const data = await res.json()
          message = typeof data === "string" ? data : data?.message || JSON.stringify(data)
        } else {
          message = await res.text()
        }
      } catch {
        // ignore
      }
      return { error: message || `HTTP ${status}`, status }
    }

    const data = (isJSON ? await res.json() : await res.text()) as T
    return { data, status }
  } catch (err: any) {
    const msg = typeof err?.message === "string" ? err.message : "Network error. Check API URL or CORS settings."
    return { error: msg, status: 0 }
  }
}
