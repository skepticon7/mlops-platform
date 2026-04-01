import {ModelResponse} from "@/types/models.types";
import {statusBadge} from "@/components/models/StatusBadge";
import {Eye, Rocket, Trash2} from "lucide-react";


const TASK_MAP = {
    "logistic_regression" : "Classification",
    "linear_regression" : "Regression",
    "kmeans" : "Clustering",
    "pca" : "Dimensionality Reduction"
}

const ALGORITHM = {
    "logistic_regression" : "Logistic Regression",
    "linear_regression" : "Linear Regression",
    "kmeans" : "KMeans",
    "pca" : "PCA"
}

interface ModelRowProps {
    row : ModelResponse,
    onView? : (model : ModelResponse) => void,
    onDeploy? : (model : ModelResponse) => void,
    onDelete? : (model : ModelResponse) => void,
    index : number,
    total : number
}

export default function ModelRow({row , onView , onDeploy , onDelete , index , total} : ModelRowProps) {

    const isLast = index === total - 1
    const borderClass = isLast ? "" : "border-b border-border"

    return (
        <tr key={row.id} className="hover:bg-white/[.02] transition-colors">
            <td className={`px-4 py-3 ${borderClass}  align-middle first:pl-5 font-semibold text-primary`}>{row.name}</td>
            <td className={`px-4 py-3 ${borderClass} text-text-secondary align-middle`}>{ALGORITHM[row.algorithm]}</td>
            <td className={`px-4 py-3 ${borderClass} text-text-secondary align-middle`}>
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11.5px] font-medium ${
                                    TASK_MAP[row.algorithm] === "Classification" ? "bg-purple-500/10 text-purple-400" :
                                        TASK_MAP[row.algorithm] === "Regression" ? "bg-blue-500/10 text-blue-400" :
                                            TASK_MAP[row.algorithm] === "Clustering" ? "bg-cyan-500/10 text-cyan-400" :
                                                "bg-yellow-500/10 text-yellow-400"
                                }`}>{TASK_MAP[row.algorithm]}</span>
            </td>
            <td className={`px-4 py-3 ${borderClass} text-text-secondary align-middle`}>{statusBadge(row.status)}</td>
            <td className={`px-4 py-3 ${borderClass} align-middle font-mono text-[13px] ${
                row.accuracy
                    ? row.accuracy > 0.90 ? "text-success"
                        : row.accuracy > 0.75 ? "text-warning"
                            : "text-danger"
                    : "text-text-tertiary"
            }`}>
                {row.accuracy ? (row.accuracy * 100).toFixed(1) + "%" : "—"}
            </td>
            <td className={`px-4 py-3 ${borderClass} text-text-tertiary align-middle text-[12px]`}>{new Date(row.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })}</td>
            <td className={`px-4 py-3 ${borderClass} align-middle `}>
                <div className="flex justify-end gap-1">
                    <button
                        // disabled={m.status !== "ready"}
                        onClick={() => {
                            // setDetailModel(m);
                            // setPage("models/detail")
                            console.log("hey")
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-text-secondary hover:text-text-primary hover:bg-background-overlay transition-colors disabled:opacity-45 disabled:pointer-events-none"
                    >
                        <Eye size={13}/>View
                    </button>
                    <button
                        // disabled={m.status !== "ready"}
                        className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1 rounded-md text-[12px] text-text-primary border border-border-strong hover:bg-background-overlay transition-colors disabled:opacity-45 disabled:pointer-events-none"
                    >
                        <Rocket size={13}/>Deploy
                    </button>
                    <button
                        onClick={() => onDelete?.(row)}
                        className="inline-flex cursor-pointer items-center p-1.5 rounded-md text-text-secondary hover:bg-background-overlay transition-colors"
                    >
                        <Trash2 size={13} className="text-danger"/>
                    </button>
                </div>
            </td>
        </tr>
    )
}