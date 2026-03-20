"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"
import type { DashboardMetricsResponse } from "@/types/analytics.types"

export function useDashboardMetrics() {
    const { token } = useAuth()
    const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        const fetchMetrics = async () => {
            try {
                const data = await apiFetch<DashboardMetricsResponse>(
                    "/analytics/dashboard",
                    { token },
                )
                setMetrics(data)
            } catch (err: unknown) {
                setError(
                    err instanceof Error ? err.message : "Error loading dashboard",
                )
            } finally {
                setLoading(false)
            }
        }

        fetchMetrics()
    }, [token])

    return { metrics, loading, error }
}
