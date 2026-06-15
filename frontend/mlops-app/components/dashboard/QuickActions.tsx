"use client"

import { useRouter } from "next/navigation"
import { Brain, Terminal, Activity } from "lucide-react"

const ACTIONS = [
    {
        icon: <Brain size={18} />,
        bg: "rgba(139,92,246,.12)",
        color: "text-[#8b5cf6]",
        title: "Train a Model",
        desc: "Pick a dataset & algorithm to fit",
        path: "/models/new",
    },
    {
        icon: <Terminal size={18} />,
        bg: "rgba(6,182,212,.12)",
        color: "text-[#06b6d4]",
        title: "Playground",
        desc: "Send live predictions to endpoints",
        path: "/playground",
    },
    {
        icon: <Activity size={18} />,
        bg: "rgba(33,197,93,.12)",
        color: "text-[#21c55d]",
        title: "All Models",
        desc: "Browse, compare & manage models",
        path: "/models",
    },
]

export default function QuickActions() {
    const router = useRouter()

    return (
        <div className="grid grid-cols-1 gap-[10px]">
            {ACTIONS.map((q) => (
                <div
                    key={q.title}
                    onClick={() => router.push(q.path)}
                    className="bg-background-subtle border border-border rounded-lg px-4 py-3 cursor-pointer transition-colors duration-120 flex flex-row items-center gap-4 hover:border-border-strong hover:bg-white/5 group"
                >
                    <div
                        className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 ${q.color}`}
                        style={{ backgroundColor: q.bg }}
                    >
                        {q.icon}
                    </div>
                    <div>
                        <div className="text-[13.5px] font-semibold text-text-primary group-hover:text-white transition-colors">
                            {q.title}
                        </div>
                        <div className="text-[12px] text-text-tertiary mt-[2px]">
                            {q.desc}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
