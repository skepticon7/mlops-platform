import React, {useState} from "react";
import {statusBadge} from "@/components/models/StatusBadge";
import {ArrowUpRight, Rocket} from "lucide-react";
import {useFetch} from "@/hooks/use-fetch";
import {ModelDetailResponse} from "@/types/model.types";
import {modelsService} from "@/services/models.service";
import Spinner from "@/components/ui/Spinner";
import Error from "@/components/models/Error";


interface ModelDetailsProps {
    model_id: string;
    onBack : () => void;
}

const ALGORITHM_LABEL: Record<string, string> = {
    logistic_regression: "Logistic Regression",
    linear_regression: "Linear Regression",
    kmeans: "KMeans",
    pca: "PCA",
}

type Tab = "metrics" | "hyperparams" | "playground"

const TASK_MAP : Record<string, string> = {
    logistic_regression: "Classification",
    linear_regression: "Regression",
    kmeans: "Clustering",
}

export default function ModelDetails({model_id , onBack} : ModelDetailsProps) {

    const [tab , setTab] = useState<Tab>("metrics")

    const tabs : {id : Tab; label: string}[] = [
        {id: "metrics" , label: "Metrics & Evaluation"},
        {id: "hyperparams" , label: "Hyperparameters"},
        {id: "playground", label: "Playground"},
    ]



    const {loading , error , data , refetch} = useFetch<ModelDetailResponse>(
        () => modelsService.getModel(model_id),
        []
    );




    if(loading) {
        return (
            <>
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Spinner/>
                    </div>
                )}
            </>
        )
    }

    if(error) {
        <Error/>
    }


    const model : ModelDetailResponse | null = data ?? null;
    const algo = model!.algorithm
    const task = TASK_MAP[algo] ?? "Unknown"
    const algoLabel = ALGORITHM_LABEL[algo] ?? algo


    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex w-full items-start justify-between mb-6 gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <h1 className="text-[20px] font-semibold tracking-[-.01em] text-text-primary">
                            {model!.name}
                        </h1>
                        {statusBadge(model!.status)}
                    </div>
                    <p className="text-[13px] text-text-secondary">
                        {algoLabel} · {task} · Trained{" "}
                        {new Date(model!.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="inline-flex cursor-pointer items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] font-medium bg-transparent text-white border border-[1px] border-secondary hover:bg-background-overlay transition-colors">
                        <ArrowUpRight size={14}/>
                        Export
                    </button>
                    <button
                        className="inline-flex cursor-pointer items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] font-medium bg-text-primary text-background hover:opacity-90 transition-opacity">
                        <Rocket size={14}/>
                        Deploy Model
                    </button>
                </div>
            </div>

            {/* Tab nav */}
            <div className="flex gap-0 border-b border-border mb-6">
                {tabs.map(({id, label}) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`px-4 py-2.5 text-[13px] cursor-pointer font-medium transition-colors border-b-2 -mb-px ${
                            tab === id
                                ? "border-text-primary text-text-primary"
                                : "border-transparent text-text-secondary hover:text-text-primary"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    )

}