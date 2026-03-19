export interface ApiErrorPayload {
  code?: string
  message?: string
  details?: unknown
}

export class ApiRequestError extends Error {
  status: number
  code: string
  details: unknown

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? "요청 처리 중 오류가 발생했습니다.")
    this.name = "ApiRequestError"
    this.status = status
    this.code = payload?.code ?? "UNKNOWN_ERROR"
    this.details = payload?.details ?? null
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/api"

function toAbsoluteUrl(path: string): string {
  if (typeof path !== "string") {
    throw new TypeError("toAbsoluteUrl: path must be a string");
  }
  if (/^https?:\/\//.test(path)) {
    return path
  }
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(toAbsoluteUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  })

  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  const rawText = await response.text()
  const payload = isJson && rawText.trim().length > 0 ? (JSON.parse(rawText) as unknown) : null

  if (!response.ok) {
    throw new ApiRequestError(response.status, payload ?? undefined)
  }

  return payload as T
}
