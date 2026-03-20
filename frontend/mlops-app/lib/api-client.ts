import { API_BASE_URL } from "@/lib/constants"

/**
 * Lightweight fetch wrapper that prepends the API base URL
 * and attaches the Authorization header when a token is provided.
 */
export async function apiFetch<T>(
    path: string,
    options: RequestInit & { token?: string | null } = {},
): Promise<T> {
    const { token, headers, ...rest } = options

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed (${res.status})`)
    }

    return res.json() as Promise<T>
}
