"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Settings } from "lucide-react"
import { Fragment } from "react"

export default function Topbar() {
    const pathname = usePathname()

    // Map pathnames to breadcrumbs
    const getBreadcrumbs = () => {
        if (pathname === "/dashboard") return [{ label: "Dashboard" }]
        if (pathname === "/models") return [{ label: "Models" }]
        if (pathname === "/models/new")
            return [{ label: "Models", href: "/models" }, { label: "Train New" }]
        if (pathname.startsWith("/models/"))
            return [{ label: "Models", href: "/models" }, { label: "Detail" }] // Detail name would ideally be dynamic
        if (pathname === "/deployments") return [{ label: "Deployments" }]
        if (pathname === "/playground") return [{ label: "Playground" }]
        return [{ label: pathname.split("/").filter(Boolean).pop() || "" }]
    }

    const breadcrumbs = getBreadcrumbs()

    return (
        <header className="h-[56px] border-b border-border flex items-center justify-between px-7 bg-background-subtle sticky top-0 z-50">
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-[6px] text-[13px]">
                <span className="text-text-tertiary">mlops-studio</span>
                {breadcrumbs.map((crumb, i) => (
                    <Fragment key={i}>
                        <ChevronRight size={12} className="text-text-tertiary" />
                        {crumb.href ? (
                            <Link
                                href={crumb.href}
                                className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-text-primary">{crumb.label}</span>
                        )}
                    </Fragment>
                ))}
            </div>

            {/* Actions */}
            <button className="flex items-center gap-[6px] px-2 py-[5px] text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-background-overlay rounded-[6px] transition-colors cursor-pointer border border-transparent">
                <Settings size={13} />
                Settings
            </button>
        </header>
    )
}
