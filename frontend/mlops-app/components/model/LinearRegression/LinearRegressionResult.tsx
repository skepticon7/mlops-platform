import {PredictState, RegressionState, ModelDetailResponse} from "@/types/model.types";
import {Loader2, Terminal} from "lucide-react";

interface LinearRegressionResultProps {
    prediction: RegressionState;
    model: ModelDetailResponse;
}

export default function LinearRegressionResult({prediction, model} : LinearRegressionResultProps) {
    return (
        <div className='rounded-lg border border-border overflow-hidden min-h-[260px]'>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-[13px] font-medium text-text-primary">Result</p>
                {prediction.data && !prediction.loading && (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-success">{prediction.ms}ms</span>
                        <span
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                                <span className="w-1.5 h-1.5 rounded-full bg-success"/>{prediction.status} OK
                            </span>
                    </div>
                )}
            </div>
            <div className="p-5">
                {!prediction.data && !prediction.loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-text-tertiary gap-3">
                        <Terminal size={20}/>
                        <p className="text-[13px]">Fill in features and hit Run</p>
                    </div>
                )}

                {prediction.loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-text-tertiary gap-3">
                        <Loader2 size={20} className="animate-spin"/>
                        <p className="text-[13px]">Sending to endpoint…</p>
                    </div>
                )}

                {prediction.data && !prediction.loading && (
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] uppercase tracking-[.07em] text-text-tertiary mb-1.5">Predicted {model.target_column || "Value"}</p>
                            <p className="text-[32px] font-bold font-mono text-blue-400">{Number(prediction.data.prediction).toLocaleString()}</p>
                            <p className="text-[12px] text-text-tertiary mt-1">{prediction.data.pourcentage_ci}% CI: {prediction.data.ci[0]} – {prediction.data.ci[1]} · {prediction.ms}ms</p>
                        </div>
                        <div className="border-t border-border pt-4">
                            <p className="text-[10px] uppercase tracking-[.07em] text-text-tertiary mb-2">Raw JSON</p>
                            <pre className="text-[11.5px] font-mono text-text-secondary bg-background-subtle rounded-md p-3 overflow-x-auto">
                                    {JSON.stringify(prediction.data, null, 2)}
                                </pre>
                        </div>
                    </div>
                )}

            </div>
        </div>

    )
}