import Spinner from "@/components/ui/Spinner"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    loadingText?: string
    children: React.ReactNode
}

export default function Button({
    isLoading = false,
    loadingText,
    children,
    className = "",
    disabled,
    ...rest
}: ButtonProps) {
    return (
        <button
            disabled={disabled || isLoading}
            className={`mt-1 w-full inline-flex items-center justify-center gap-[6px] px-[14px] py-[8px] rounded-[6px] text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors duration-100 hover:bg-[#ddd] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none ${className}`}
            {...rest}
        >
            {isLoading ? (
                <>
                    <Spinner size={14} className="" />
                    {loadingText}
                </>
            ) : (
                children
            )}
        </button>
    )
}
