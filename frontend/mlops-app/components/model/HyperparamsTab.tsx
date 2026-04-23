import {ModelDetailResponse} from "@/types/model.types";

interface HyperparamsTabProps {
    model : ModelDetailResponse
}

export default function HyperparamsTab({model} : HyperparamsTabProps) {

    return (
        <div className={'w-full'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-[13px] font-medium text-text-primary">Training Configuration</p>
                    </div>
                    <table className="w-full text-[13px]">
                        <thead>
                        <tr className="border-b border-border bg-background-subtle">
                            <th className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">Parameter</th>
                            <th className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(model.hyperparams).map(([key, value]) => (
                            <tr key={key} className="border-b border-border last:border-0">
                                <td className="px-4 py-2.5 font-mono text-text-secondary">{key}</td>
                                <td className="px-4 py-2.5 font-mono text-blue-400">{String(value)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-[13px] font-medium text-text-primary">Dataset Info</p>
                    </div>
                    <div>
                        {Object.entries(model.dataset_details).map(([k, v]) => (
                            <div key={k}
                                 className="flex justify-between text-[13px] px-4 py-3 border-b border-border last:border-0">
                                <span className="text-text-tertiary">{k}</span>
                                <span className="font-mono text-text-secondary">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    )

}