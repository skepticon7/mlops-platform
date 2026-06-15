"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"
import { modelsService } from "@/services/models.service"
import {
    Upload,
    Brain,
    Activity,
    BarChart2,
    ChevronRight,
    ChevronLeft,
    Check,
    CheckCircle2,
    X,
    Zap,
    Cpu,
    Info,
    Loader2,
} from "lucide-react"

/* ── Algorithm / Hyperparameter metadata ─────────────────────────────── */

const ALGOS: Record<string, { id: string; name: string; task: string }[]> = {
    supervised: [
        { id: "linear_regression", name: "Linear Regression", task: "Regression" },
        { id: "logistic_regression", name: "Logistic Regression", task: "Classification" },
    ],
    unsupervised: [
        { id: "kmeans", name: "KMeans", task: "Clustering" },
    ],
}

const ALGO_META: Record<string, { badge: string; color: string; desc: string }> = {
    linear_regression: { badge: "Regression", color: "#0070f3", desc: "Fit a linear relationship between continuous features and a numeric target." },
    logistic_regression: { badge: "Classification", color: "#8b5cf6", desc: "Estimate class probabilities using a logistic sigmoid boundary." },
    kmeans: { badge: "Clustering", color: "#06b6d4", desc: "Partition data into k clusters by minimising within-cluster variance." },
}

interface HpDef {
    key: string
    label: string
    type: "number" | "select"
    opts?: string[]
    default: string
}

const HYPERPARAMS: Record<string, HpDef[]> = {
    linear_regression: [{ key: "fit_intercept", label: "Fit Intercept", type: "select", opts: ["true", "false"], default: "true" }],
    logistic_regression: [
        { key: "C", label: "Regularization (C)", type: "number", default: "1.0" },
        { key: "max_iter", label: "Max Iterations", type: "number", default: "100" },
        { key: "solver", label: "Solver", type: "select", opts: ["lbfgs", "liblinear", "newton-cg"], default: "lbfgs" },
    ],
    kmeans: [
        { key: "max_k", label: "Max Clusters limit (Auto k-selection)", type: "number", default: "10" },
        { key: "max_iter", label: "Max Iterations", type: "number", default: "300" },
        { key: "init", label: "Init Method", type: "select", opts: ["k-means++", "random"], default: "k-means++" },
    ],
}

const CATS = [
    { id: "supervised", label: "Supervised Learning", desc: "Train on labelled data to predict outcomes", icon: <Brain size={20} />, color: "#8b5cf6", bg: "rgba(139,92,246,.12)" },
    { id: "unsupervised", label: "Unsupervised Learning", desc: "Discover hidden structure in unlabelled data", icon: <Activity size={20} />, color: "#06b6d4", bg: "rgba(6,182,212,.12)" },
]

const STEP_LABELS = ["Upload Dataset", "Choose Algorithm", "Review & Train"]

/* ── Types ───────────────────────────────────────────────────────────── */

interface CsvData {
    name: string
    headers: string[]
    rows: string[][]
    totalRows: number
    file: File
}

interface LogLine {
    t: string
    c: string
    msg: string
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function NewModelPage() {
    const { token } = useAuth()
    const router = useRouter()

    const [step, setStep] = useState(0)
    const [csvData, setCsvData] = useState<CsvData | null>(null)
    const [dragging, setDragging] = useState(false)
    const [category, setCategory] = useState("")
    const [algo, setAlgo] = useState("")
    const [hpValues, setHpValues] = useState<Record<string, string>>({})
    const [targetCol, setTargetCol] = useState("")
    const [modelName, setModelName] = useState("")
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [logLines, setLogLines] = useState<LogLine[]>([])
    const [error, setError] = useState<string | null>(null)

    /* CSV parsing */
    const parseCSV = (text: string, fileName: string, file: File): CsvData | null => {
        const lines = text.trim().split("\n").filter(Boolean)
        if (lines.length < 2) return null
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
        const rows = lines.slice(1, 6).map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")))
        return { name: fileName, headers, rows, totalRows: lines.length - 1, file }
    }

    const handleFile = (file: File | undefined) => {
        if (!file || !file.name.endsWith(".csv")) return
        const reader = new FileReader()
        reader.onload = e => {
            const d = parseCSV(e.target?.result as string, file.name, file)
            if (d) setCsvData(d)
        }
        reader.readAsText(file)
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer?.files[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const selAlgo = [...(ALGOS.supervised || []), ...(ALGOS.unsupervised || [])].find(a => a.id === algo)
    const hps = HYPERPARAMS[algo] || []

    const pickCategory = (cat: string) => { setCategory(cat); setAlgo(""); setHpValues({}); setTargetCol("") }
    const pickAlgo = (id: string) => { setAlgo(id); setHpValues({}) }

    /* Real training call to backend */
    const startTraining = async () => {
        if (!csvData || !token) return
        setLoading(true)
        setProgress(0)
        setLogLines([{ t: new Date().toLocaleTimeString('en-US', {hour12: false}), c: "text-blue-400", msg: `Submitting training job for ${csvData.name}...` }])
        setError(null)

        try {
            // Build hyperparams object with defaults
            const hyperparams: Record<string, string> = {}
            hps.forEach(h => { hyperparams[h.key] = hpValues[h.key] ?? h.default })

            const configJson = JSON.stringify({
                name: modelName,
                algorithm: algo,
                task_type: category,
                target_column: category === "supervised" ? targetCol : undefined,
                hyperparams: Object.keys(hyperparams).length > 0 ? hyperparams : undefined,
            })

            const formData = new FormData()
            formData.append("file", csvData.file)
            formData.append("config_json", configJson)

            const res = await modelsService.trainModel(formData)
            const taskId = res.data.task_id

            setLogLines(l => [...l, { t: new Date().toLocaleTimeString('en-US', {hour12: false}), c: "text-green-400", msg: `✓ Job accepted. Task ID: ${taskId}. Waiting for worker...` }])

            // Poll the task status every 500ms
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await modelsService.getTaskStatus(taskId)
                    const taskData = statusRes.data

                    if (taskData.state === "PROGRESS") {
                        const newProgress = taskData.progress || 0
                        const currentStatus = taskData.status || "Processing"
                        setProgress(prev => {
                            // Only log if progress increased
                            if (newProgress > prev) {
                                setLogLines(l => [...l, { t: new Date().toLocaleTimeString('en-US', {hour12: false}), c: "", msg: `Progress: ${newProgress}% - ${currentStatus.replace(/_/g, " ")}` }])
                            }
                            return newProgress
                        })
                    } else if (taskData.state === "SUCCESS") {
                        clearInterval(pollInterval)
                        setProgress(100)
                        setLogLines(l => [
                            ...l,
                            { t: new Date().toLocaleTimeString('en-US', {hour12: false}), c: "text-green-400", msg: `✓ Training completed successfully.` },
                            { t: new Date().toLocaleTimeString('en-US', {hour12: false}), c: "text-green-400", msg: `Redirecting to models...` }
                        ])
                        setTimeout(() => router.push("/models"), 1500)
                    } else if (taskData.state === "FAILURE") {
                        clearInterval(pollInterval)
                        throw new Error(taskData.error || "Celery worker failed during training")
                    }
                } catch (pollErr: any) {
                    clearInterval(pollInterval)
                    const msg = pollErr?.response?.data?.detail || pollErr?.message || "Polling failed"
                    setError(msg)
                    setLogLines(l => [...l, { t: "ERR", c: "text-red-400", msg: `✗ ${msg}` }])
                    setProgress(0)
                    setLoading(false)
                }
            }, 500)

        } catch (err: any) {
            const msg = err?.response?.data?.detail || err?.message || "Training failed"
            setError(msg)
            setLogLines(l => [
                ...l,
                { t: "ERR", c: "text-red-400", msg: `✗ ${msg}` },
            ])
            setProgress(0)
            setLoading(false)
        }
    }

    /* ── Render ─────────────────────────────────────────────────────────── */

    return (
        <div className="p-8 w-full max-w-[1400px] mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-[6px] text-[12.5px] text-text-tertiary mb-5">
                <span className="cursor-pointer hover:text-text-secondary transition-colors" onClick={() => router.push("/models")}>Models</span>
                <ChevronRight size={12} />
                <span className="text-text-primary">Train New Model</span>
            </div>

            {/* Page Header */}
            <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
                <div>
                    <h1 className="text-[20px] font-semibold tracking-[-.01em] text-text-primary">Train New Model</h1>
                    <p className="text-[13px] text-text-secondary mt-[3px]">Configure a machine-learning pipeline in 3 steps</p>
                </div>
            </div>

            {/* Steps */}
            <div className="flex items-center mb-8">
                {STEP_LABELS.map((s, i) => (
                    <div key={s} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? 1 : "none", gap: 8 }}>
                        <div className={`flex items-center gap-2 text-[13px] shrink-0`}>
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
                                ${i < step ? "bg-success text-black" : i === step ? "bg-white text-black" : "bg-background-overlay text-text-tertiary border border-border"}`}>
                                {i < step ? <Check size={11} /> : i + 1}
                            </div>
                            <div className={`${i === step ? "text-text-primary font-medium" : "text-text-secondary"}`}>{s}</div>
                        </div>
                        {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border mx-3" />}
                    </div>
                ))}
            </div>

            {/* ── STEP 0: Upload Dataset ───────────────────────────────────── */}
            {step === 0 && !loading && (
                <div className="grid grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Training Data</div>
                        <div
                            className={`border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${dragging ? "border-[#444] bg-white/[.02]" : "border-border hover:border-[#444] hover:bg-white/[.02]"}`}
                            style={{ padding: "56px 32px" }}
                            onDragOver={e => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById("csv-inp")?.click()}
                        >
                            <input id="csv-inp" type="file" accept=".csv" hidden onChange={e => handleFile(e.target.files?.[0])} />
                            <div className="w-[52px] h-[52px] rounded-[14px] bg-background-overlay flex items-center justify-center mx-auto mb-3 text-text-secondary">
                                <Upload size={22} />
                            </div>
                            <div className="text-[15px] text-text-secondary mb-[6px]"><strong>Click to upload</strong> or drag & drop</div>
                            <div className="text-[12px] text-text-tertiary">CSV only · Max 100 MB · UTF-8 encoded</div>
                        </div>
                        {csvData && (
                            <div className="mt-4 bg-background-subtle border border-border rounded-md px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-[10px]">
                                    <CheckCircle2 size={15} className="text-success" />
                                    <div>
                                        <div className="font-medium text-[13px]">{csvData.name}</div>
                                        <div className="text-[12px] text-text-tertiary mt-[1px]">{csvData.totalRows.toLocaleString()} rows · {csvData.headers.length} columns</div>
                                    </div>
                                </div>
                                <button className="inline-flex items-center gap-1 px-2 py-[5px] rounded-md text-[12px] text-text-secondary bg-transparent border-none cursor-pointer hover:text-text-primary hover:bg-background-overlay transition-colors" onClick={() => setCsvData(null)}>
                                    <X size={12} /> Remove
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Data Preview</div>
                        {csvData ? (
                            <div className="border border-border rounded-md overflow-hidden">
                                <div className="px-4 py-2 bg-background-subtle border-b border-border text-[11px] text-text-tertiary font-semibold uppercase tracking-[.07em] flex items-center justify-between">
                                    <span>First 5 rows</span><span>{csvData.headers.length} columns detected</span>
                                </div>
                                <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                                    <table className="w-full border-collapse text-[12px]">
                                        <thead>
                                            <tr>
                                                {csvData.headers.map(h => (
                                                    <th key={h} className="text-left text-[11px] font-medium text-text-tertiary px-4 py-[10px] border-b border-border font-mono whitespace-nowrap uppercase tracking-[.04em]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvData.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/[.02]">
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="px-4 py-3 border-b border-border text-text-secondary font-mono whitespace-nowrap">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="border border-dashed border-border rounded-md h-[200px] flex flex-col items-center justify-center text-text-tertiary gap-2">
                                <BarChart2 size={28} />
                                <div className="text-[13px]">Preview appears here after upload</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── STEP 1: Choose Algorithm ─────────────────────────────────── */}
            {step === 1 && !loading && (
                <div className="grid grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Learning Type</div>
                        <div className="grid grid-cols-2 gap-[10px] mb-6">
                            {CATS.map(cat => (
                                <div
                                    key={cat.id}
                                    onClick={() => pickCategory(cat.id)}
                                    className="rounded-lg p-4 cursor-pointer transition-all"
                                    style={{
                                        border: `1px solid ${category === cat.id ? cat.color : "var(--color-border)"}`,
                                        background: category === cat.id ? cat.bg : "var(--color-background-subtle)",
                                    }}
                                >
                                    <div className="mb-[10px]" style={{ color: category === cat.id ? cat.color : "var(--color-text-tertiary)" }}>{cat.icon}</div>
                                    <div className="font-semibold text-[13.5px] mb-1">{cat.label}</div>
                                    <div className="text-[12px] text-text-tertiary leading-[1.5]">{cat.desc}</div>
                                </div>
                            ))}
                        </div>
                        {category && (
                            <>
                                <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">
                                    {category === "supervised" ? "Supervised" : "Unsupervised"} Algorithms
                                </div>
                                <div className="flex flex-col gap-2">
                                    {ALGOS[category].map(a => {
                                        const meta = ALGO_META[a.id]
                                        const active = algo === a.id
                                        return (
                                            <div
                                                key={a.id}
                                                onClick={() => pickAlgo(a.id)}
                                                className="rounded-md px-4 py-[13px] cursor-pointer transition-all flex items-center gap-[14px]"
                                                style={{
                                                    border: `1px solid ${active ? "var(--color-text-primary)" : "var(--color-border)"}`,
                                                    background: active ? "rgba(255,255,255,.04)" : "var(--color-background-subtle)",
                                                }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-[3px]">
                                                        <span className="font-semibold text-[13.5px]">{a.name}</span>
                                                        <span
                                                            className="inline-flex items-center px-2 py-[1px] rounded-full text-[10px] font-medium"
                                                            style={{ background: `${meta.color}18`, color: meta.color }}
                                                        >
                                                            {meta.badge}
                                                        </span>
                                                    </div>
                                                    <div className="text-[12px] text-text-tertiary leading-[1.5]">{meta.desc}</div>
                                                </div>
                                                <div
                                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ border: `2px solid ${active ? "var(--color-text-primary)" : "var(--color-border)"}` }}
                                                >
                                                    {active && <div className="w-[10px] h-[10px] rounded-full bg-white" />}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        {category === "supervised" && (
                            <div>
                                <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Target Variable</div>
                                {!csvData ? (
                                    <div className="border border-dashed border-border rounded-md px-6 py-5 text-center text-text-tertiary">
                                        <div className="text-[13px]">Upload a CSV first to select a target column</div>
                                    </div>
                                ) : (
                                    <div className="bg-background-subtle border border-border rounded-lg">
                                        <div className="p-5 pb-4">
                                            <div className="text-[13px] text-text-secondary mb-3 leading-[1.5]">Choose the column your model should learn to predict.</div>
                                            <select className="w-full bg-background-subtle border border-border rounded-md px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-[#444] transition-colors" value={targetCol} onChange={e => setTargetCol(e.target.value)}>
                                                <option value="">Select target column…</option>
                                                {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            {targetCol && (
                                                <div className="mt-[10px] flex items-center gap-2 text-[12.5px] text-text-secondary">
                                                    <CheckCircle2 size={13} className="text-success" />
                                                    <span>Target: <span className="font-mono font-semibold text-text-primary">{targetCol}</span></span>
                                                    <span className="text-text-tertiary">· {csvData.headers.length - 1} feature{csvData.headers.length - 1 !== 1 ? "s" : ""} remaining</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Hyperparameters</div>
                            {!algo ? (
                                <div className="border border-dashed border-border rounded-md px-6 py-12 text-center text-text-tertiary">
                                    <Cpu size={28} className="mx-auto mb-[10px]" />
                                    <div className="text-[13px]">Select an algorithm to configure its hyperparameters</div>
                                </div>
                            ) : (
                                <div className="bg-background-subtle border border-border rounded-lg">
                                    <div className="px-5 py-[14px] border-b border-border flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-[13.5px]">{selAlgo?.name}</div>
                                            <div className="text-[12px] text-text-tertiary mt-[2px]">{hps.length} configurable parameter{hps.length !== 1 ? "s" : ""}</div>
                                        </div>
                                        <span
                                            className="inline-flex items-center px-2 py-[1px] rounded-full text-[11px] font-medium"
                                            style={{ background: `${ALGO_META[algo]?.color}18`, color: ALGO_META[algo]?.color }}
                                        >
                                            {ALGO_META[algo]?.badge}
                                        </span>
                                    </div>
                                    <div className="p-5 flex flex-col gap-4">
                                        {hps.map(h => (
                                            <div key={h.key} className="flex flex-col gap-[5px]">
                                                <div className="flex items-baseline justify-between">
                                                    <label className="text-[12.5px] font-medium font-mono">{h.key}</label>
                                                    <span className="text-[11px] text-text-tertiary">{h.label}</span>
                                                </div>
                                                {h.type === "select" ? (
                                                    <select
                                                        className="w-full bg-background-subtle border border-border rounded-md px-3 py-2 text-[13.5px] text-text-primary outline-none cursor-pointer focus:border-[#444]"
                                                        value={hpValues[h.key] ?? h.default}
                                                        onChange={e => setHpValues(p => ({ ...p, [h.key]: e.target.value }))}
                                                    >
                                                        {h.opts?.map(o => <option key={o}>{o}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        className="w-full bg-background-subtle border border-border rounded-md px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-[#444]"
                                                        type="number"
                                                        value={hpValues[h.key] ?? h.default}
                                                        onChange={e => setHpValues(p => ({ ...p, [h.key]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                        <div className="mt-1 px-[14px] py-[10px] bg-background-overlay rounded-md text-[12px] text-text-tertiary leading-[1.7]">
                                            <Info size={12} className="inline mr-[6px] align-middle" />
                                            Unmodified params will use their recommended defaults at training time.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Review & Train ───────────────────────────────────── */}
            {step === 2 && !loading && (
                <div className="grid grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Configuration Summary</div>
                        <div className="bg-background-subtle border border-border rounded-lg mb-5">
                            {[
                                ["Dataset", csvData?.name || "—", true],
                                ["Rows × Columns", `${csvData?.totalRows?.toLocaleString() || "—"} × ${csvData?.headers?.length || "—"}`, true],
                                ["Algorithm", selAlgo?.name || "—", false],
                                ["Task", selAlgo?.task || "—", false],
                                ...(category === "supervised" ? [["Target Column", targetCol || "—", true]] : []),
                            ].map(([k, v, mono]) => (
                                <div key={k as string} className="flex justify-between items-center px-5 py-[13px] border-b border-border">
                                    <span className="text-[12.5px] text-text-tertiary">{k as string}</span>
                                    <span className={`text-[13px] font-medium text-text-primary ${mono ? "font-mono" : ""}`}>{v as string}</span>
                                </div>
                            ))}
                            <div className="px-5 py-[13px]">
                                <div className="text-[12.5px] text-text-tertiary mb-[6px]">Hyperparameters</div>
                                <div className="font-mono text-[12px] text-[#0070f3] leading-[1.8]">
                                    {Object.entries(
                                        Object.fromEntries(hps.map(h => [h.key, hpValues[h.key] ?? h.default]))
                                    ).map(([k, v]) => (
                                        <span key={k} className="inline-block bg-[rgba(0,112,243,.08)] rounded px-[7px] py-[1px] mr-[6px] mb-1">{k}={v}</span>
                                    ))}
                                    {hps.length === 0 && <span className="text-text-tertiary">defaults</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Model Name</div>
                        <div className="bg-background-subtle border border-border rounded-lg">
                            <div className="p-5 flex flex-col gap-5">
                                <div className="flex flex-col gap-[5px]">
                                    <label className="text-[13px] font-medium">Give your model a name</label>
                                    <input
                                        className="w-full bg-background-subtle border border-border rounded-md px-[14px] py-[10px] text-[15px] text-text-primary outline-none focus:border-[#444]"
                                        placeholder="e.g. Iris Classifier v2"
                                        value={modelName}
                                        onChange={e => setModelName(e.target.value)}
                                    />
                                    <span className="text-[11.5px] text-text-tertiary">Use a descriptive name so you can identify it in the models list</span>
                                </div>
                                <div className="bg-background-overlay rounded-md px-4 py-[14px]">
                                    <div className="text-[12px] text-text-tertiary leading-[1.8]">
                                        <div className="flex gap-2 mb-1"><CheckCircle2 size={13} className="text-success shrink-0 mt-[2px]" /><span>Dataset loaded and validated</span></div>
                                        <div className="flex gap-2 mb-1"><CheckCircle2 size={13} className="text-success shrink-0 mt-[2px]" /><span>Algorithm and hyperparameters set</span></div>
                                        <div className="flex gap-2"><CheckCircle2 size={13} className={`shrink-0 mt-[2px] ${modelName ? "text-success" : "text-text-tertiary"}`} /><span className={modelName ? "text-text-secondary" : "text-text-tertiary"}>Model name {modelName ? "provided" : "required"}</span></div>
                                    </div>
                                </div>
                                {error && (
                                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-[13px]">{error}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Training Progress View ───────────────────────────────────── */}
            {loading && (
                <div className="grid grid-cols-2 gap-6 items-start">
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Training Progress</div>
                        <div className="bg-background-subtle border border-border rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-[10px]">
                                        <Loader2 size={16} className="animate-spin text-[#0070f3]" />
                                        <span className="font-medium">Training <span className="text-text-secondary">{modelName}</span></span>
                                    </div>
                                    <span className={`font-mono text-[13px] ${progress === 100 ? "text-success" : "text-text-tertiary"}`}>{Math.round(progress)}%</span>
                                </div>
                                <div className="h-[5px] bg-background-overlay rounded-sm overflow-hidden mb-5">
                                    <div className="h-full bg-white rounded-sm transition-all duration-400" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[["Algorithm", selAlgo?.name], ["Dataset", csvData?.name], ["Rows", csvData?.totalRows?.toLocaleString()], ["Status", progress < 100 ? "Running…" : "Complete"]].map(([k, v]) => (
                                        <div key={k as string}>
                                            <div className="text-[10px] text-text-tertiary uppercase tracking-[.06em] mb-[3px]">{k}</div>
                                            <div className="text-[13px] font-medium">{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[.07em] mb-3">Training Log</div>
                        <div className="bg-background-subtle border border-border rounded-md px-[14px] py-3 font-mono text-[11.5px] text-text-secondary h-[180px] overflow-y-auto flex flex-col gap-[3px]">
                            {logLines.map((l, i) => (
                                <div key={i} className="flex gap-[10px]">
                                    <span className="text-text-tertiary shrink-0">[{l.t}]</span>
                                    <span className={l.c}>{l.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Navigation Footer ────────────────────────────────────────── */}
            {!loading && (
                <div className="mt-8 pt-5 border-t border-border flex justify-between items-center">
                    <button
                        className="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-md text-[13px] font-medium bg-transparent text-text-primary border border-border cursor-pointer transition-colors hover:bg-background-overlay"
                        onClick={() => step > 0 ? setStep(s => s - 1) : router.push("/models")}
                    >
                        <ChevronLeft size={14} />{step === 0 ? "Cancel" : "Back"}
                    </button>
                    <div className="flex items-center gap-2">
                        {step < 2 ? (
                            <button
                                className="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-md text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors hover:bg-[#ddd] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none"
                                disabled={(step === 0 && !csvData) || (step === 1 && (!algo || (category === "supervised" && !targetCol)))}
                                onClick={() => setStep(s => s + 1)}
                            >
                                Continue <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button
                                className="inline-flex items-center gap-[6px] px-5 py-2 rounded-md text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors hover:bg-[#ddd] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none"
                                disabled={!modelName}
                                onClick={startTraining}
                            >
                                <Zap size={14} /> Start Training
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
