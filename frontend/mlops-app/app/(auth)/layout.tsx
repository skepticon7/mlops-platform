"use client"

import { Cpu } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Spinner from "@/components/ui/Spinner"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace("/dashboard")
        }
    }, [isAuthenticated, isLoading, router])

    if (isLoading || isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Spinner />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
            {/* Logo */}
            <div className="flex items-center gap-[9px] text-[17px] font-bold mb-7 text-text-primary">
                <Cpu size={20} />
                MLOps Studio
            </div>

            {/* Card */}
            <div className="w-full max-w-[380px] bg-background-subtle border border-border rounded-lg">
                <div className="p-7">{children}</div>
            </div>
        </div>
    )
}
