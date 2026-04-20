import {LogisticModel, ModelDetailResponse} from "@/types/model.types";
import React from "react";
import {formatMetrics} from "@/utils/metrics";

interface LogisticRegressionMetricsProps {
    model : LogisticModel
}

export default function LogisticRegMetrics({model} : LogisticRegressionMetricsProps) {

    const metricsFormatted = formatMetrics(model);
    const {confusion_matrix: cm , confusion_matrix_labels : labels} = model.metrics

    const metricsCard =  [
        {label : "Accuracy" , value : metricsFormatted["accuracy"] , sub : "Test set accuracy" , level : model.metrics.accuracy > 0.9 ? 'high' : model.metrics.accuracy > 0.75 ? 'medium' : 'low'},
            {label : "F1 Score" , value : metricsFormatted["f1-score"] , sub : "Weighted average" },
            {label : "Precision" , value : metricsFormatted["precision"] , sub : "Weighted average"},
            {label : "Recall" , value : metricsFormatted['recall'] , sub : "Weighted average"},
        ]


    return (
        <>
            <div className={'grid grid-cols-4 gap-3'}>
                {metricsCard.map(m => (
                    <div key={m.label} className="rounded-lg border border-border bg-background-subtle p-4">
                        <p className="text-[11px] uppercase tracking-[.06em] text-text-tertiary mb-2">{m.label}</p>
                        <p className={`text-[22px] font-semibold font-mono ${
                            (m.level ? (m.level === "high" ? 'text-success' : m.level === "medium" ? 'text-warning' : 'text-danger') : 'text-text-primary')
                        }`}>{m.value}</p>
                        <p className="text-[11.5px] text-text-tertiary mt-1">{m.sub}</p>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-[13px] font-medium text-text-primary">Classification Report</p>
                        </div>
                        <table className="w-full text-[12.5px]">
                            <thead>
                            <tr className="border-b border-border bg-background-subtle">
                                {["Class", "Precision", "Recall", "F1", "Support"].map(h => (
                                    <th key={h} className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(model.metrics.per_class).map(([cls , metrics]) => (
                                <tr key={cls} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2.5 font-mono font-semibold text-text-primary">{cls}</td>
                                    <td className="px-4 py-2.5 font-mono text-text-secondary">{(metrics.precision * 100).toFixed(1)}%</td>
                                    <td className="px-4 py-2.5 font-mono text-text-secondary">{(metrics.recall * 100).toFixed(1)}%</td>
                                    <td className="px-4 py-2.5 font-mono text-text-secondary">{(metrics["f1-score"] * 100).toFixed(1)}%</td>
                                    <td className="px-4 py-2.5 font-mono text-text-secondary">{metrics.support}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-[13px] font-medium text-text-primary">Confusion Matrix</p>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <div
                                className="grid gap-1.5 text-center text-[12px]"
                                style={{gridTemplateColumns: `auto repeat(${labels.length}, 1fr)`}}
                            >
                                {/* Top-left empty cell + predicted headers */}
                                <div/>
                                {labels.map((label) => (
                                    <div key={label}
                                         className="text-[11px] uppercase tracking-wide text-text-tertiary py-1 truncate">
                                        {label}
                                    </div>
                                ))}

                                {/* Rows */}
                                {cm.map((row, rowIdx) => (
                                    <React.Fragment key={rowIdx}>
                                        {/* Row label */}
                                        <div
                                            className="text-[11px] uppercase tracking-wide text-text-tertiary flex items-center pr-2 whitespace-nowrap">
                                            {labels[rowIdx]}
                                        </div>
                                        {/* Cells */}
                                        {row.map((val, colIdx) => (
                                            <div
                                                key={colIdx}
                                                className={`font-mono rounded-md py-3 px-4 text-[16px] ${
                                                    rowIdx === colIdx
                                                        ? "bg-success/10 text-success font-semibold"  // diagonal = correct
                                                        : "bg-danger/10 text-danger"                   // off-diagonal = wrong
                                                }`}
                                            >
                                                {val}
                                            </div>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
        </>
    )
}