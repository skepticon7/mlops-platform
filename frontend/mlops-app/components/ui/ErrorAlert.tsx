interface ErrorAlertProps {
    message: string
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
    return (
        <div className="bg-danger-muted border border-danger/20 rounded-[6px] px-3 py-2 text-[12.5px] text-danger">
            {message}
        </div>
    )
}
