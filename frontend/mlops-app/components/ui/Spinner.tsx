import { Loader2 } from "lucide-react"

interface SpinnerProps {
    className?: string
    size?: number
}

export default function Spinner({ className = "text-text-tertiary", size = 24 }: SpinnerProps) {
    return <Loader2 size={size} className={`animate-spin ${className}`} />
}
