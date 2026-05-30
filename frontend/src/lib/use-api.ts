import useSWR from "swr"
import { apiFetch } from "@/lib/api"

async function fetcher(url: string) {
  const res = await apiFetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.error || `Error ${res.status}`)
  }
  const data = await res.json()

  // Normalizar de forma segura colecciones contables relacionales y paginadas
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return data
}

export function useApiData<T = unknown>(
  url: string | null,
  options?: {
    revalidateOnFocus?: boolean
    dedupingInterval?: number
    fallbackData?: T
    refreshInterval?: number
  }
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: options?.revalidateOnFocus ?? false,
    dedupingInterval: options?.dedupingInterval ?? 30_000,
    fallbackData: options?.fallbackData,
    refreshInterval: options?.refreshInterval,
    onError: (err: Error) => {
      const msg = err?.message ?? ""
      if (msg.includes("401") || msg.includes("403")) {
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }
    },
  })
}
