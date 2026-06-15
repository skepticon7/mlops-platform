import {date} from "yup";

type Algorithm = "linear_regression" | "logistic_regression" | "kmeans"

type Status = "pending" | "failed" | "training" | "completed"

export interface ModelResponse {
    id : string;
    name : string;
    algorithm : Algorithm;
    accuracy : number;
    status : Status;
    created_at : string;
}

export interface ModelPaginationResponse {
    models : ModelResponse[];
    total_pages : number;
    page : number;
    total : number;
}


type ML_Algorithm = "logistic_regression" | "linear_regression" | "kmeans";
type TaskType = "supervised" | "unsupervised";
type ModelStatus = "failed" | "training" | "completed" | "pending"


type PerClassMetrics = {
    precision: number;
    recall: number;
    "f1-score": number;
    support: number;
}

export type LogisticRegressionMetrics = {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    per_class : Record<string, PerClassMetrics>,
    confusion_matrix : number[][],
    confusion_matrix_labels : string[]
}

type LogisticRegressionHyperparams = {
    c: number;
    max_iter: number;
    solver: string;
    multi_class: string;
    penalty: string;
    tol: number;
    random_state: number;
}

export type LinearRegressionMetrics = {
    test_mse: number;
    train_mse: number;
    rmse: number;
    coef_norm: number;
    mae: number;
    features_importance: Record<string , number>
    intercept?: number | null;
    train_r2: number;
    test_r2: number;
    r2?: number;
    mse?: number;
}

type LinearRegressionHyperparams = {
    fit_intercept: boolean;
    copy_x: boolean;
    n_jobs: number;
    positive: boolean;
}

type ClusteringMetrics = {
    silhouette_score: number;
    davies_bouldin_score: number;
    calinski_harabasz_score: number;
    inertia: number;
    cluster_profiles : Record<string, Record<string, any>>
    cluster_sizes : Record<string, number>
    optimal_k?: number;
}

type ClusteringHyperparams = {
    n_clusters: number;
    init: string;
    max_iter: number;
    train_split: number;
    random_state: number;
}


type DatasetDetails = {
    total_rows: number;
    total_feature: number;
    target_column? : string;
    train_samples?: number;
    test_samples?: number;
}

export type Feature = {
    name: string;
    dType: string;
    example: string | number;
    is_valid_feature : boolean

}

export type PredictRequest = {
    algorithm: Algorithm
   features : Record<string, string | number>
}

type BasePredictionResponse = {
    model_id : string;
    type: string;
}

export type ClusteringResponse = BasePredictionResponse & {
    type: "clustering";
    cluster: number;
    distances: Record<string, number>;
}

export type ClassificationResponse = BasePredictionResponse & {
    type: "classification";
    prediction: string;
    confidence: number;
    probabilities: Record<string, number>;
};

export type LinearRegressionResponse = BasePredictionResponse & {
    type: "regression";
    prediction: number;
    ci: number[];
    pourcentage_ci: number;
}



export type PredictResponse = | ClassificationResponse | LinearRegressionResponse | ClusteringResponse;


export type PredictState<T extends PredictResponse = PredictResponse> = {
    loading: boolean;
    error: string | null;
    status: number | null;
    ms: number | null;
    data: T | null;
};

export type ClassificationState = PredictState<ClassificationResponse>;

export type RegressionState = PredictState<LinearRegressionResponse>;

export type ClusteringState = PredictState<ClusteringResponse>;



type BaseModelDetail = {
    id: string;
    name: string;
    algorithm: Algorithm;
    task_type : TaskType;
    features : Feature[];
    dataset_details: DatasetDetails,
    target_column?: string;
    status: Status;
    created_at: string;
}
export type ModelDetailResponse = |
    (BaseModelDetail & {
        algorithm : "logistic_regression";
        metrics : LogisticRegressionMetrics;
        hyperparams : LogisticRegressionHyperparams;
    })
    |
    (BaseModelDetail & {
        algorithm : "linear_regression";
        metrics : LinearRegressionMetrics;
        hyperparams : LinearRegressionHyperparams;
    })
    |
    (BaseModelDetail & {
        algorithm : "kmeans";
        metrics : ClusteringMetrics;
        hyperparams : ClusteringHyperparams;
    })


export type LogisticModel = Extract<ModelDetailResponse, {algorithm : "logistic_regression"}>
export type LinearModel = Extract<ModelDetailResponse, {algorithm : "linear_regression"}>
export type ClusteringModel = Extract<ModelDetailResponse, {algorithm : "kmeans"}>