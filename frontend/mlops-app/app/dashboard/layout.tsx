"use client"

import { useAuth } from "@/hooks/use-auth"
import Sidebar from "@/components/layout/Sidebar"
import Topbar from "@/components/layout/Topbar"
import Spinner from "@/components/ui/Spinner"
import { SIDEBAR_WIDTH } from "@/lib/constants"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace("/login")
        }
    }, [isAuthenticated, isLoading, router])

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text-secondary gap-4">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div
                className="flex-1 flex flex-col min-h-screen"
                style={{ marginLeft: SIDEBAR_WIDTH }}
            >
                <Topbar />
                <main className="flex-1 w-full bg-background">{children}</main>
            </div>
        </div>
    )
}
