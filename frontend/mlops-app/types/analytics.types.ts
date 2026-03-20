export interface AccuracyLeaderboardItem {
    name: string
    algo: string
    acc: number
}

export interface DeploymentItem {
    id: string
    modelId: string
    model: string
    endpoint: string
    active: boolean
    created: string
}

export interface DashboardMetricsResponse {
    models_trained: number
    active_deployments: number
    total_predictions: string
    avg_accuracy: string
    accuracy_leaderboard: AccuracyLeaderboardItem[]
    recent_deployments: DeploymentItem[]
    prediction_volume: number[]
}
