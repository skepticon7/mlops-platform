"use client"

import {
    Brain,
    Database,
    Activity,
    BarChart2,
    TrendingUp,
    TrendingDown,
} from "lucide-react"
import type { DashboardMetricsResponse } from "@/types/analytics.types"

interface StatsGridProps {
    metrics: DashboardMetricsResponse
}

const STATS = [
    {
        label: "Models Trained",
        key: "models_trained" as const,
        change: "+0 this week",
        up: true,
        icon: <Brain size={52} />,
        color: "#a78bfa",
    },
    {
        label: "Datasets Uploaded",
        key: "active_deployments" as const,
        change: "From local storage",
        up: true,
        icon: <Database size={52} />,
        color: "#38bdf8",
    },
    {
        label: "Total Predictions",
        key: "total_predictions" as const,
        change: "+0% vs last week",
        up: true,
        icon: <Activity size={52} />,
        color: "#34d399",
    },
    {
        label: "Avg Accuracy",
        key: "avg_accuracy" as const,
        change: "Calculated from completed models",
        up: true,
        icon: <BarChart2 size={52} />,
        color: "#fb923c",
    },
]

export default function StatsGrid({ metrics }: StatsGridProps) {
    return (
        <div className="grid grid-cols-4 gap-[14px] mb-6">
            {STATS.map((s) => (
                <div
                    key={s.label}
                    className="bg-background-subtle border border-border rounded-lg px-5 py-[18px] relative overflow-hidden flex flex-col justify-between"
                >
                    <div
                        className="absolute right-[14px] top-1/2 -translate-y-1/2 opacity-35 pointer-events-none"
                        style={{ color: s.color }}
                    >
                        {s.icon}
                    </div>
                    <div className="text-[11.5px] text-text-tertiary font-medium uppercase tracking-[.06em] mb-[10px]">
                        {s.label}
                    </div>
                    <div className="text-[30px] font-bold tracking-[-.03em] leading-none mb-[6px] text-text-primary">
                        {String(metrics[s.key])}
                    </div>
                    <div
                        className={`flex items-center gap-1 text-[12px] ${
                            s.up ? "text-success" : "text-danger"
                        }`}
                    >
                        {s.up ? (
                            <TrendingUp size={11} />
                        ) : (
                            <TrendingDown size={11} />
                        )}
                        {s.change}
                    </div>
                </div>
            ))}
        </div>
    )
}
