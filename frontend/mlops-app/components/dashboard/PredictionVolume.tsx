"use client"

import { TrendingUp } from "lucide-react"

interface PredictionVolumeProps {
    totalPredictions: string
    volume: number[]
}

export default function PredictionVolume({
    totalPredictions,
    volume,
}: PredictionVolumeProps) {
    return (
        <div className="bg-background-subtle border border-border rounded-lg flex flex-col">
            <div className="px-5 py-[14px] border-b border-border flex items-center justify-between">
                <span className="font-medium text-[13px] text-text-primary">
                    Prediction Volume
                </span>
                <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[11px] font-medium bg-success-muted text-success">
                    <span className="w-[5px] h-[5px] rounded-full bg-current" />
                    Live
                </span>
            </div>

            <div className="p-5">
                <div className="mb-[14px]">
                    <span className="text-[24px] font-bold tracking-[-.02em] text-text-primary">
                        {totalPredictions === "0" ? "0" : "12,431"}
                    </span>
                    <span className="inline-flex items-center gap-[3px] text-[12px] text-success ml-2">
                        <TrendingUp size={11} />
                        +0.0%
                    </span>
                </div>

                <div className="text-[12px] text-text-tertiary mb-[14px]">
                    Requests past 12 days
                </div>

                <div className="flex items-end gap-[5px] h-[72px]">
                    {volume.map((v, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t border-b hover:opacity-75 transition-opacity cursor-default ${
                                i === volume.length - 1
                                    ? "bg-accent border-transparent"
                                    : "bg-background-overlay border-border-strong border-[1px]"
                            }`}
                            style={{ height: `${v === 0 ? 5 : v}%` }}
                        />
                    ))}
                </div>

                <div className="flex justify-between mt-[6px] text-[11px] text-text-tertiary">
                    <span>-12d</span>
                    <span>-6d</span>
                    <span>Today</span>
                </div>
            </div>
        </div>
    )
}
