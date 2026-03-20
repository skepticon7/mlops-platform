interface StatusBadgeProps {
    status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const isActive = status === "active"
    return (
        <span
            className={`inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[11.5px] font-medium ${
                isActive
                    ? "bg-success-muted text-success"
                    : "bg-white/10 text-text-tertiary"
            }`}
        >
            <span
                className="w-[5px] h-[5px] rounded-full"
                style={{ backgroundColor: "currentColor" }}
            />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}
