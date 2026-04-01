import {AlertTriangle} from "lucide-react";

export default function Error() {
    return(
        <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div
                    className="w-11 h-11 rounded-lg bg-background-muted border border-border flex items-center justify-center">
                    <AlertTriangle size={20} className="text-danger"/>
                </div>
                <p className="text-[14px] font-medium text-text-primary">Something went wrong</p>
                <p className="text-[13px] text-text-secondary">Failed to load models. Please try again.</p>
        </div>
    )
}