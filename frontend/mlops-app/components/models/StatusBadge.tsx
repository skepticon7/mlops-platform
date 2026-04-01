import {ModelResponse} from "@/types/models.types";

export function statusBadge(status: ModelResponse["status"]) {
    const map = {
        completed: { label: "Completed", class: "bg-success/10 text-success" },
        training:  { label: "Training",  class: "bg-warning/10 text-warning" },
        pending:   { label: "Pending",   class: "bg-zinc-500/10 text-text-tertiary" },
        failed:    { label: "Failed",    class: "bg-danger/10 text-danger" },
    }
    const s = map[status]
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[11.5px] font-medium ${s.class}`}>
            <span className="w-[5px] h-[5px] rounded-full bg-current" />
            {s.label}
        </span>
    )
}