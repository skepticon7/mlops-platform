import {Feature, ModelDetailResponse, PredictRequest, PredictResponse, PredictState} from "@/types/model.types";
import {useEffect, useState,} from "react";
import {AlertCircle, Loader2, Play, Terminal} from "lucide-react";
import {getTypeInput} from "@/utils/playground";
import toast from "react-hot-toast";
import {modelsService} from "@/services/models.service";
import LogisticRegressionResult from "@/components/model/logitsticRegression/LogisticRegressionResult";

interface PlaygroundTabProps {
    model : ModelDetailResponse
}

export default function PlaygroundTab({model} : PlaygroundTabProps) {

    const features : Feature[] = model.features;

    const [inputs, setInputs] = useState<PredictRequest>({
        algorithm: model.algorithm,
        features: Object.fromEntries(
            model.features.map((f) => [f.name, f.example])
        ),
    });



    const [result , setResult] = useState<PredictState>({
        loading : false,
        error: null,
        status: null,
        ms: null,
        data: null,
    });

    const handlePredict = async () => {
        const start = performance.now()

        setResult((prev) => ({
            ...prev,
            loading: true,
            error: null
        }))

        try{
            const response = await modelsService.predict(model.id , inputs);
            const end = performance.now();
            setResult((prev) => ({
                ...prev,
                loading: false,
                error: null,
                status: response.status,
                ms: Math.round(end - start),
                data: response.data
            }));
        }catch (e: any) {
            const end = performance.now();
            setResult({
                loading: false,
                error: e?.message || "Prediction failed",
                status: e?.response?.status || null,
                ms: Math.round(end - start),
                data: null,
            });
            console.log(`Error Predicting : ${e}`);
            toast.error(result.error || "failed to run prediction");
        }finally {
            setResult((prev) => ({...prev , loading: false }))
        }
    }


    return (
        <div className='grid grid-cols-1 lg:grid-cols-[500px_1fr] gap-4 items-start'>
            <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="text-[13px] font-medium text-text-primary">Input Features</p>
                    <span
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"/>
                        Ready
                    </span>
                </div>
                <div className="p-4 space-y-3">
                    {features.map((f) => (
                        <div key={f.name} className="grid grid-cols-[1fr_110px] items-center gap-3">
                            <div>
                                <p className="text-[12px] font-mono text-text-secondary">{f.name}</p>
                                <p className="text-[10px] text-text-tertiary">{f.dType}</p>
                            </div>
                            <input
                                type={getTypeInput(f.dType)}
                                placeholder={f.dType.includes("numeric") ? "0" : "value"}
                                value={inputs.features[f.name] ?? ""}
                                onChange={(e) =>
                                    setInputs((prev) => ({
                                        ...prev,
                                        features: {
                                            ...prev.features,
                                            [f.name]: isNaN(Number(e.target.value))
                                                ? e.target.value
                                                : Number(e.target.value),
                                        },
                                    }))
                                }
                                className="text-right font-mono text-[12px] px-2.5 py-1.5 rounded-md border border-border bg-background-subtle text-text-primary focus:outline-none focus:border-border-strong w-full"
                            />
                        </div>
                    ))}
                </div>

                <div className="px-4 pb-4">
                    <button
                        onClick={handlePredict}
                        disabled={result.loading}
                        className="w-full inline-flex cursor-pointer justify-center items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium bg-text-primary text-background hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {result.loading
                            ? <><Loader2 size={13} className="animate-spin"/>Running…</>
                            : <><Play size={13}/>Run Prediction</>
                        }
                    </button>
                </div>
            </div>
            {model.algorithm === "logistic_regression" && <LogisticRegressionResult prediction={result}/>}
        </div>
    )
}