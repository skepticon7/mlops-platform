import {Loader2, Terminal} from "lucide-react";
import {ClassificationResponse, ClassificationState, PredictState} from "@/types/model.types";

interface LogisticRegressionResultProps {
    prediction : ClassificationState;
}

export default function LogisticRegressionResult({prediction}: LogisticRegressionResultProps) {
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
                            <p className="text-[10px] uppercase tracking-[.07em] text-text-tertiary mb-1.5">Predicted
                                Class</p>
                            <p className="text-[32px] font-bold font-mono text-success">{prediction.data.prediction}</p>
                            <p className="text-[12px] text-text-tertiary mt-1">{(prediction.data.confidence * 100).toFixed(1)}%
                                confidence · {prediction.ms}ms</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-[.07em] text-text-tertiary mb-3">Class
                                Probabilities</p>
                            {Object.entries(prediction.data.probabilities).map(([cls, prob]: [string, any]) => (
                                <div key={cls} className="mb-3">
                                    <div className="flex justify-between text-[12px] mb-1.5">
                                        <span className="font-mono text-text-secondary">{cls}</span>
                                        <span className="text-text-tertiary">{(prob * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${prob * 100}%`,
                                                background: cls === prediction.data?.prediction ? "var(--color-success, #22c55e)" : "var(--color-border-strong, #555)"
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border pt-4">
                            <p className="text-[10px] uppercase tracking-[.07em] text-text-tertiary mb-2">Raw
                                JSON</p>
                            <pre
                                className="text-[11.5px] font-mono text-text-secondary bg-background-subtle rounded-md p-3 overflow-x-auto">
                                    {JSON.stringify(prediction.data, null, 2)}
                                </pre>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}