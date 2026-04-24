"use client"

import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import type { AccuracyLeaderboardItem } from "@/types/analytics.types"

interface AccuracyLeaderboardProps {
    items: AccuracyLeaderboardItem[]
}

function getAccuracyColor(acc: number) {
    if (acc > 0.9) return { text: "text-success", bar: "bg-success" }
    if (acc > 0.75) return { text: "text-warning", bar: "bg-warning" }
    return { text: "text-danger", bar: "bg-danger" }
}

export default function AccuracyLeaderboard({ items }: AccuracyLeaderboardProps) {
    const router = useRouter()

    return (
        <div className="bg-background-subtle border border-border  rounded-lg flex flex-col">
            <div className="px-5 py-[14px] border-b border-border flex items-center justify-between">
                <span className="font-medium text-[13px] text-text-primary">
                    Accuracy Leaderboard
                </span>
                <button
                    onClick={() => router.push("/models")}
                    className="inline-flex items-center gap-[6px] px-2 py-[5px] rounded-[6px] text-[12px] font-medium text-text-secondary border border-transparent hover:text-text-primary hover:bg-background-overlay transition-colors"
                >
                    All models <ChevronRight size={12} />
                </button>
            </div>

            <div className="p-5 flex flex-col gap-[14px]">
                {items.length === 0 ? (
                    <div className="text-text-tertiary text-[13px] text-center py-4">
                        No models evaluated yet.
                    </div>
                ) : (
                    items.map((m, i) => {
                        const colors = getAccuracyColor(m.acc)
                        return (
                            <div key={m.name} className="flex items-center gap-[14px]">
                                <div className="w-6 h-6 rounded-full bg-background-overlay flex items-center justify-center text-[11px] font-bold text-text-tertiary shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-[5px]">
                                        <div>
                                            <div className="text-[13px] font-medium text-text-primary">
                                                {m.name}
                                            </div>
                                            <div className="text-[11.5px] text-text-tertiary mt-[1px]">
                                                {m.algo}
                                            </div>
                                        </div>
                                        <span
                                            className={`text-[13px] font-bold shrink-0 ml-2 font-[var(--font-mono)] ${colors.text}`}
                                        >
                                            {(m.acc * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-[5px] bg-background-overlay rounded-[3px] overflow-hidden">
                                        <div
                                            className={`h-full rounded-[3px] ${colors.bar}`}
                                            style={{ width: `${m.acc * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
