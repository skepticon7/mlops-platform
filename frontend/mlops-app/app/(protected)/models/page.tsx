"use client"
import {AlertTriangle, BrainCircuit, ChevronLeft, ChevronRight, Eye, Plus, Rocket, Trash2} from "lucide-react";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {ModelPaginationResponse, ModelResponse} from "@/types/models.types";
import {useFetch} from "@/hooks/use-fetch";
import {modelsService} from "@/services/models.service";
import toast from "react-hot-toast";
import Spinner from "@/components/ui/Spinner";
import NoModels from "@/components/models/NoModels";
import {statusBadge} from "@/components/models/StatusBadge"
import ModelRow from "@/components/models/ModelRow";
import Error from "@/components/models/Error";


export default function ModelsPage() {


    const router = useRouter();

    const [page, setPage] = useState(1)

    const {data  , loading , error , refetch} = useFetch<ModelPaginationResponse>(
        () => modelsService.getModels(page),
        [page]
    )

    const totalPages : number = data?.total_pages ?? 0
    const total : number = data?.total ?? 0
    const models : ModelResponse[] | null = data?.models ?? null


    const handleDelete = async (model : ModelResponse) => {
        try {
            await modelsService.deleteModel(model.id)
            toast.success("Model successfully deleted")
            refetch()
        }catch (e) {
            console.log(`Error deleting model : ${e}`)
            toast.error("Failed to delete model")
        }
    }


    return (
        <div className='w-full p-8'>

            {models?.length === 0 && !error && (
                <NoModels onAction={() => router.push("/models/new")}/>
            )}

            {error && (
                <Error/>
            )}

            {models && models?.length > 0 && (
                <div >
                    <div className="flex w-full items-start justify-between mb-7 gap-4 flex-wrap">
                        <div>
                            <h1 className="text-[20px] font-semibold tracking-[-.01em] text-text-primary">
                                Models
                            </h1>
                            <p className="text-[13px] text-text-secondary mt-[3px]">
                                All trained models and their evaluation metrics
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/models/new")}
                            className="inline-flex text-secondary items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors duration-120 hover:bg-[#ddd]"
                        >
                            <Plus size={14}/>
                            Train New Model
                        </button>

                    </div>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full bg-background-subtle border-collapse text-[13.5px]">
                                <thead>
                                <tr>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em] first:pl-5">Name</th>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em]">Algorithm</th>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em]">Task</th>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em]">Status</th>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em]">Accuracy</th>
                                    <th className="text-left text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em]">Created</th>
                                    <th className="text-[11.5px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border uppercase tracking-[.04em] text-right pr-5">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {models.map((m: ModelResponse , index : number) => (<ModelRow index={index} total={total} row={m} onDelete={handleDelete} />
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between py-3 border-t border-border">
                            <p className="text-[12px] text-text-tertiary">
                                Showing {(page - 1) * 6 + 1}–{Math.min(page * 6, total)} of {total}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-[12px] text-text-secondary border border-border hover:bg-background-overlay transition-colors disabled:opacity-45 disabled:pointer-events-none"
                                >
                                    <ChevronLeft size={14}/>
                                </button>

                                {Array.from({length: totalPages}, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[12px] transition-colors ${
                                            p === page
                                                ? "bg-background-overlay text-text-primary border border-border-strong"
                                                : "text-text-secondary hover:bg-background-overlay border border-transparent"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === totalPages}
                                    className="inline-flex items-center px-2 py-1 rounded-md text-[12px] text-text-secondary border border-border hover:bg-background-overlay transition-colors disabled:opacity-45 disabled:pointer-events-none"
                                >
                                    <ChevronRight size={14}/>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <Spinner/>
                </div>
            )}


        </div>
    )
}