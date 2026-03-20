"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics"
import Spinner from "@/components/ui/Spinner"
import StatsGrid from "@/components/dashboard/StatsGrid"
import PredictionVolume from "@/components/dashboard/PredictionVolume"
import QuickActions from "@/components/dashboard/QuickActions"
import AccuracyLeaderboard from "@/components/dashboard/AccuracyLeaderboard"
import RecentDeployments from "@/components/dashboard/RecentDeployments"

export default function DashboardPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { metrics, loading, error } = useDashboardMetrics()

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                <Spinner />
            </div>
        )
    }

    if (error || !metrics) {
        return (
            <div className="p-8 w-full max-w-[1400px] mx-auto text-danger text-sm">
                {error || "Failed to load dashboard"}
            </div>
        )
    }

    return (
        <div className="p-8 w-full max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
                <div>
                    <h1 className="text-[20px] font-semibold tracking-[-.01em] text-text-primary">
                        Good morning, {user?.firstName || "User"} 👋
                    </h1>
                    <p className="text-[13px] text-text-secondary mt-[3px]">
                        Here&apos;s an overview of your ML workspace
                    </p>
                </div>
                <button
                    onClick={() => router.push("/models/new")}
                    className="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors duration-120 hover:bg-[#ddd]"
                >
                    <Plus size={14} />
                    New Model
                </button>
            </div>

            <StatsGrid metrics={metrics} />

            {/* Middle Section: Volume + Quick Actions */}
            <div className="grid grid-cols-2 gap-[20px] mb-5">
                <PredictionVolume
                    totalPredictions={metrics.total_predictions}
                    volume={metrics.prediction_volume}
                />
                <QuickActions />
            </div>

            {/* Bottom Section: Accuracy + Deployments */}
            <div className="grid grid-cols-2 gap-[20px] pb-8">
                <AccuracyLeaderboard items={metrics.accuracy_leaderboard} />
                <RecentDeployments deployments={metrics.recent_deployments} />
            </div>
        </div>
    )
}
