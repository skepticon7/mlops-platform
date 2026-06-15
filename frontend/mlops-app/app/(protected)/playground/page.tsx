"use client"

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFetch } from "@/hooks/use-fetch";
import { modelsService } from "@/services/models.service";
import { ModelResponse, ModelDetailResponse } from "@/types/model.types";
import Spinner from "@/components/ui/Spinner";
import PlaygroundTab from "@/components/model/PlaygroundTab";
import ErrorAlert from "@/components/ui/ErrorAlert";
import { Terminal, BrainCircuit, ChevronDown, Check, Sliders, AlertTriangle, Cpu } from "lucide-react";
import Link from "next/link";

const TASK_MAP: Record<string, string> = {
    logistic_regression: "Classification",
    linear_regression: "Regression",
    kmeans: "Clustering"
};

const ALGORITHM_LABEL: Record<string, string> = {
    logistic_regression: "Logistic Regression",
    linear_regression: "Linear Regression",
    kmeans: "KMeans"
};

export default function PlaygroundPage() {
    const router = useRouter();
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Fetch all completed models
    const { data: completedModels, loading: modelsLoading, error: modelsError } = useFetch<ModelResponse[]>(
        () => modelsService.getCompletedModels(),
        []
    );

    // Fetch details of the selected model
    const [modelDetail, setModelDetail] = useState<ModelDetailResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedModelId) {
            setModelDetail(null);
            return;
        }

        const fetchDetail = async () => {
            setDetailLoading(true);
            setDetailError(null);
            try {
                const response = await modelsService.getModel(selectedModelId);
                setModelDetail(response.data);
            } catch (err: any) {
                console.error("Error fetching model details:", err);
                setDetailError(err.message || "Failed to load model details.");
            } finally {
                setDetailLoading(false);
            }
        };

        fetchDetail();
    }, [selectedModelId]);

    // Handle initial selection if completedModels are loaded and selectedModelId is not set
    useEffect(() => {
        if (completedModels && completedModels.length > 0 && !selectedModelId) {
            setSelectedModelId(completedModels[0].id);
        }
    }, [completedModels, selectedModelId]);

    const activeModel = completedModels?.find(m => m.id === selectedModelId);

    if (modelsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Spinner size={32} />
                <p className="text-[13px] text-text-secondary mt-3">Loading available models...</p>
            </div>
        );
    }

    if (modelsError) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <ErrorAlert message={`Failed to load models: ${modelsError}`} />
            </div>
        );
    }

    if (!completedModels || completedModels.length === 0) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-[16px] font-semibold text-text-primary mb-1">No Completed Models</h2>
                <p className="text-[13px] text-text-secondary mb-5 leading-[1.6]">
                    You haven't successfully completed training for any models yet. Train a new model first to interact with it in the playground.
                </p>
                <Link
                    href="/models/new"
                    className="inline-flex text-secondary items-center gap-[6px] px-[16px] py-[8px] rounded-[6px] text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors duration-120 hover:bg-[#ddd]"
                >
                    <BrainCircuit size={14} />
                    Train a Model
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-[20px] font-semibold tracking-[-.01em] text-text-primary flex items-center gap-2">
                    <Terminal size={20} className="text-text-secondary" />
                    Model Playground
                </h1>
                <p className="text-[13px] text-text-secondary mt-[3px]">
                    Select any completed model and interact with it by submitting features to obtain real-time predictions.
                </p>
            </div>

            {/* Model Selector Card */}
            <div className="relative z-40 bg-background-subtle border border-border rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <label className="text-[11.5px] font-medium uppercase tracking-[.04em] text-text-tertiary block">
                            Active Model
                        </label>
                        <div className="relative">
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="flex items-center justify-between gap-2.5 px-4 py-2 bg-background border border-border rounded-md text-[13.5px] text-text-primary font-medium hover:border-border-strong transition-colors min-w-[280px] text-left cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Cpu size={14} className="text-text-secondary" />
                                    <span>{activeModel?.name || "Select a model..."}</span>
                                </div>
                                <ChevronDown size={14} className="text-text-tertiary" />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute left-0 mt-1.5 w-[320px] bg-background border border-border rounded-md shadow-lg overflow-hidden py-1 max-h-[250px] overflow-y-auto">
                                    {completedModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                setSelectedModelId(model.id);
                                                setDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-background-overlay text-left transition-colors text-[13px] text-text-primary border-b border-border last:border-b-0 cursor-pointer"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="font-medium">{model.name}</div>
                                                <div className="text-[11px] text-text-secondary">
                                                    {ALGORITHM_LABEL[model.algorithm] || model.algorithm}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                                        TASK_MAP[model.algorithm] === "Classification" ? "bg-purple-500/10 text-purple-400" :
                                                            TASK_MAP[model.algorithm] === "Regression" ? "bg-blue-500/10 text-blue-400" :
                                                                TASK_MAP[model.algorithm] === "Clustering" ? "bg-cyan-500/10 text-cyan-400" :
                                                                    "bg-yellow-500/10 text-yellow-400"
                                                    }`}
                                                >
                                                    {TASK_MAP[model.algorithm] || "Unknown"}
                                                </span>
                                                {model.id === selectedModelId && <Check size={14} className="text-text-primary" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {activeModel && (
                        <div className="flex gap-4 text-[12px] self-end md:self-center">
                            <div>
                                <span className="text-text-tertiary block">Algorithm</span>
                                <span className="text-text-primary font-medium">{ALGORITHM_LABEL[activeModel.algorithm]}</span>
                            </div>
                            <div className="border-l border-border h-8 self-center" />
                            <div>
                                <span className="text-text-tertiary block">Task Type</span>
                                <span className="text-text-primary font-medium">{TASK_MAP[activeModel.algorithm]}</span>
                            </div>
                            {activeModel.accuracy !== null && activeModel.accuracy !== undefined && (
                                <>
                                    <div className="border-l border-border h-8 self-center" />
                                    <div>
                                        <span className="text-text-tertiary block">Accuracy</span>
                                        <span className="text-success font-medium">{(activeModel.accuracy * 100).toFixed(1)}%</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Interactive Section */}
            <div className="relative z-10">
                {detailLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] bg-background-subtle border border-border rounded-lg">
                        <Spinner size={24} />
                        <p className="text-[13px] text-text-secondary mt-3">Loading model features and configuration...</p>
                    </div>
                ) : detailError ? (
                    <ErrorAlert message={`Error loading model details: ${detailError}`} />
                ) : modelDetail ? (
                    <PlaygroundTab model={modelDetail} />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[300px] bg-background-subtle border border-border rounded-lg text-center p-6 text-text-secondary">
                        <Sliders size={28} className="mb-2.5 text-text-tertiary" />
                        <p className="text-[13px]">Select a model above to load the playground.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
