"use client"

import { useAuth } from "@/hooks/use-auth"
import { SIDEBAR_WIDTH } from "@/lib/constants"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
    LayoutDashboard,
    Brain,
    Plus,
    Rocket,
    Terminal,
    Cpu,
    LogOut,
} from "lucide-react"

export default function Sidebar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()

    const navItem = (label: string, icon: React.ReactNode, path: string) => {
        const isActive = pathname === path || pathname.startsWith(`${path}/`)
        return (
            <Link
                href={path}
                className={`flex items-center gap-[9px] px-[10px] py-[7px] rounded-[6px] text-[13.5px] transition-colors duration-120 w-full text-left ${isActive
                    ? "text-text-primary bg-background-overlay"
                    : "text-text-secondary hover:text-text-primary hover:bg-background-overlay"
                    }`}
            >
                {icon}
                {label}
            </Link>
        )
    }

    return (
        <aside className="bg-background-subtle border-r border-border flex flex-col fixed top-0 left-0 h-screen z-[100] overflow-y-auto" style={{ width: SIDEBAR_WIDTH }}>
            {/* Logo */}
            <div className="px-4 pt-[18px] pb-[12px] flex items-center gap-[10px] font-bold text-[15px] border-b border-border text-text-primary">
                <Cpu size={18} />
                MLOps Studio
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 flex flex-col gap-[1px] overflow-y-auto">
                {navItem("Dashboard", <LayoutDashboard size={14} />, "/dashboard")}

                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[.09em] px-[10px] pt-[14px] pb-[5px]">
                    Models
                </div>
                {navItem("All Models", <Brain size={14} />, "/models")}
                {navItem("Train New Model", <Plus size={14} />, "/models/new")}

                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[.09em] px-[10px] pt-[14px] pb-[5px]">
                    Space
                </div>
                {navItem("Playground", <Terminal size={14} />, "/playground")}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-3 border-t border-border mt-auto">
                <button
                    onClick={() => logout()}
                    className="flex flex-row text-left items-center gap-[10px] p-2 rounded-[6px] cursor-pointer hover:bg-background-overlay transition-colors w-full group"
                >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {user ? `${user.firstName[0]}${user.lastName[0]}` : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-text-primary truncate">
                            {user ? `${user.firstName} ${user.lastName}` : "User"}
                        </div>
                    </div>
                    <LogOut
                        size={13}
                        className="text-text-tertiary group-hover:text-text-primary transition-colors"
                    />
                </button>
            </div>
        </aside>
    )
}
