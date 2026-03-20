/* ── Layout ── */
export const SIDEBAR_WIDTH = 240

/* ── Storage keys ── */
export const STORAGE_KEYS = {
    TOKEN: "mlops_token",
    USER: "mlops_user",
} as const

/* ── API ── */
export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
