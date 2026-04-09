import {date} from "yup";

type Algorithm = "linear_regression" | "logistic_regression" | "kmeans" | "pca"

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


type LogisticRegressionMetrics = {
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
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

type LinearRegressionMetrics = {
    mse: number;
    rmse: number;
    mae: number;
    r2: number;
}

type LinearRegressionHyperparams = {
    fit_intercept: boolean;
    copy_x: boolean;
    n_jobs: number;
    positive: boolean;
}



type BaseModelDetail = {
    id: string;
    name: string;
    algorithm: Algorithm;
    task_type : TaskType;
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
    })