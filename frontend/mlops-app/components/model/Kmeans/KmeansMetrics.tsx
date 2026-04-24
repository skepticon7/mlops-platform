import {ClusteringModel} from "@/types/model.types";
import {formatMetrics} from "@/utils/metrics";
import React from "react";

interface KmeansMetricsProps {
    model: ClusteringModel
}

const CLUSTER_COLORS = [
    "#0d6efd", // blue
    "#6f42c1", // purple
    "#0dcaf0", // cyan
    "#198754", // green
    "#ffc107", // yellow
    "#dc3545", // red (added)
    "#fd7e14", // orange (added)
    "#20c997"  // teal (added)
];
export default function KmeansMetrics({model} : KmeansMetricsProps) {

    const metricsFormatted = formatMetrics(model);

    const metricsCard = [
        {
            label: "Silhouette Score",
            value: metricsFormatted["silhouette_score"],
            sub: "Cluster separation quality",
            level: model.metrics.silhouette_score > 0.5 ? 'high' : model.metrics.silhouette_score > 0.3 ? 'medium' : 'low'
        },
        {
            label: "Davies Bouldin",
            value: metricsFormatted["davies_bouldin_score"],
            sub: "Cluster overlap ",
        },
        {
            label: "Calinski Harabasz",
            value: metricsFormatted["calinski_harabasz_score"],
            sub: "Cluster density",
        },
        {
            label: "Inertia",
            value: metricsFormatted["inertia"],
            sub: "Within-cluster sum of squares",
        },
    ]

    const featureNames = Object.keys(model.metrics.cluster_profiles['Cluster 0'])
    const clusterProfiles = Object.entries(model.metrics.cluster_profiles)
    const clusterSizes = Object.entries(model.metrics.cluster_sizes)
    const total = model.dataset_details.total_rows

    return(
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
            <div className="grid grid-cols-2 gap-5">

                {/* CLUSTER PROFILES */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <span className="text-[13px] font-medium text-text-primary">Cluster Profiles</span>
                        <span
                            className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-400">
                k = {model.hyperparams.n_clusters}
            </span>
                    </div>
                    <table className="w-full text-[12.5px] border-collapse">
                        <thead>
                        <tr className="border-b border-border bg-background-subtle">
                            <th className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">Cluster</th>
                            <th className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">Size</th>
                            {featureNames.map(f => (
                                <th key={f}
                                    className="text-left px-4 py-2 text-[11px] uppercase tracking-[.04em] text-text-tertiary font-medium">
                                    {f.split("_").join(" ")}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {clusterProfiles.map(([cluster, features], i) => {
                            const size = model.metrics.cluster_sizes[cluster]
                            const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
                            return (
                                <tr key={cluster}
                                    className="border-b border-border last:border-0 hover:bg-white/[.02] transition-colors">
                                    <td className="px-4 py-2.5 align-middle">
                            <span
                                className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] font-medium"
                                style={{background: color + "22", color}}>
                                C{i}
                            </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[12.5px] text-text-secondary align-middle">
                                        {size.toLocaleString()}
                                    </td>
                                    {featureNames.map(f => (
                                        <td key={f}
                                            className="px-4 py-2.5 font-mono text-[12.5px] text-success align-middle">
                                            {(features as Record<string, number>)[f].toFixed(2)}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>

                {/* CLUSTER SIZE DISTRIBUTION */}
                <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <span className="text-[13px] font-medium text-text-primary">Cluster Size Distribution</span>
                    </div>
                    <div className="p-5">
                        {clusterSizes.map(([cluster, size], i) => {
                            const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
                            const pct = (size / total * 100).toFixed(1)
                            return (
                                <div key={cluster} className="mb-4 last:mb-0">
                                    <div className="flex justify-between items-center text-[12.5px] mb-1.5">
                                        <span className="font-mono font-semibold" style={{color}}>{cluster}</span>
                                        <span className="font-mono text-[12px] text-text-tertiary">
                                {size.toLocaleString()} ({pct}%)
                            </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                                        <div className="h-full rounded-full transition-all"
                                             style={{width: `${pct}%`, background: color}}/>
                                    </div>
                                </div>
                            )
                        })}

                        <div
                            className="mt-4 px-3 py-2.5 bg-background-muted rounded-md text-[12px] text-text-tertiary">
                <span className="text-cyan-400 font-semibold">
                    Silhouette: {model.metrics.silhouette_score.toFixed(3)}
                </span>
                            {" · "}
                            Inertia: {model.metrics.inertia?.toLocaleString(undefined, {maximumFractionDigits: 1})}
                        </div>
                    </div>
                </div>

            </div>
        </>

    )
}