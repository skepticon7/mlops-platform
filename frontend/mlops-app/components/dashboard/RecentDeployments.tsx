"use client"

import { useRouter } from "next/navigation"
import { ChevronRight, Server, Rocket } from "lucide-react"
import StatusBadge from "@/components/ui/StatusBadge"
import type { DeploymentItem } from "@/types/analytics.types"

interface RecentDeploymentsProps {
    deployments: DeploymentItem[]
}

export default function RecentDeployments({ deployments }: RecentDeploymentsProps) {
    const router = useRouter()

    return (
        <div className="bg-background-subtle border border-border rounded-lg flex flex-col">
            <div className="px-5 py-[14px] border-b border-border flex items-center justify-between">
                <span className="font-medium text-[13px] text-text-primary">
                    Recent Deployments
                </span>
                <button
                    onClick={() => router.push("/deployments")}
                    className="inline-flex items-center gap-[6px] px-2 py-[5px] rounded-[6px] text-[12px] font-medium text-text-secondary border border-transparent hover:text-text-primary hover:bg-background-overlay transition-colors"
                >
                    Manage <ChevronRight size={12} />
                </button>
            </div>

            <div>
                {deployments.length === 0 ? (
                    <div className="p-5 text-center text-[13px] text-text-tertiary border-b border-border">
                        No active deployments.
                    </div>
                ) : (
                    deployments.map((dep, i) => (
                        <div
                            key={dep.id}
                            className={`flex items-center gap-[14px] px-5 py-[14px] ${
                                i < deployments.length - 1
                                    ? "border-b border-border"
                                    : ""
                            }`}
                        >
                            <div
                                className={`w-9 h-9 rounded-[9px] shrink-0 flex items-center justify-center border ${
                                    dep.active
                                        ? "bg-success/10 border-success/20 text-success"
                                        : "bg-white/5 border-border text-text-tertiary"
                                }`}
                            >
                                <Server size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-text-primary mb-[3px] truncate">
                                    {dep.model}
                                </div>
                                <div className="text-[11px] font-[var(--font-mono)] text-text-tertiary truncate">
                                    {dep.endpoint}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-[5px] shrink-0">
                                <StatusBadge
                                    status={dep.active ? "active" : "inactive"}
                                />
                                <span className="text-[11px] text-text-tertiary">
                                    {dep.created}
                                </span>
                            </div>
                        </div>
                    ))
                )}

                <div className="px-5 py-3 border-t border-border mt-auto">
                    <button
                        onClick={() => router.push("/models")}
                        className="w-full inline-flex items-center justify-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[12px] font-medium bg-transparent border border-border text-text-primary cursor-pointer transition-colors duration-120 hover:bg-background-overlay"
                    >
                        <Rocket size={13} /> Deploy a model
                    </button>
                </div>
            </div>
        </div>
    )
}
