import {LinearModel} from "@/types/model.types";
import {formatMetrics} from "@/utils/metrics";
import React from "react";

interface LinearRegressionMetricsProps {
    model: LinearModel;
}

export default function LinearRegMetrics({model} : LinearRegressionMetricsProps) {

    const metricsFormatted = formatMetrics(model);

    const metricsCard =
        [
            {
                label: "R² Score",
                value: metricsFormatted["test_r2"],
                sub: "Test set performance",
                level: model.metrics.test_r2 > 0.75 ? "high" : model.metrics.test_r2 > 0.6 ? "medium" : "low"
            },
            {
                label: "RMSE",
                value: metricsFormatted["rmse"],
                sub: "Prediction error (lower is better)"
            },
            {
                label: "MAE",
                value: metricsFormatted["mae"],
                sub: "Average absolute error"
            },
            {
                label: "MSE",
                value: metricsFormatted["test_mse"],
                sub: "Squared error on test set"
            }
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

            <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                    <p className="text-[13px] font-medium text-text-primary">Regression Summary</p>
                </div>
                <div className="p-5 space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            ["TRAIN R²", metricsFormatted["train_mse"]],
                            ["TRAIN MSE", metricsFormatted["train_mse"]],
                            ["INTERCEPT", metricsFormatted["intercept"]],
                            ["COEF. NORM", metricsFormatted["coef_norm"]],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <p className="text-[10px] uppercase tracking-[.05em] text-text-tertiary mb-1">{k}</p>
                                <p className="font-mono text-[16px] font-semibold text-text-primary">{v}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-[.06em] text-text-tertiary mb-3">Feature
                            Importances</p>
                        {metricsFormatted["features_importance"]?.map((f) => (
                            <div className='mb-3' key={f.feature}>
                                <div className="flex justify-between text-[12px] mb-1.5">
                                    <span className="font-mono text-text-secondary">{f.feature}</span>
                                    <span className="text-text-tertiary">{f.importance}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-400 transition-all"
                                        style={{width: `${f.importance}%`}}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}