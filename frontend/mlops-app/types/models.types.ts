import {date} from "yup";

type Algorithm = "linear_regression" | "logistic_regression" | "kmeans" | "pca"

type Status = "pending" | "failed" | "training" | "failed"

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