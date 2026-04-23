import {LogisticRegressionMetrics, ModelDetailResponse} from "@/types/model.types";
import {formatMetrics} from "@/utils/metrics";
import LogisticRegMetrics from "../model/logitsticRegression/LogisticRegressionMetrics"
import React from "react";
import LinearRegMetrics from "@/components/model/LinearRegression/LinearRegressionMetrics";


interface MetricsTabProps {
    model : ModelDetailResponse
}

export default function MetricsTab({model} : MetricsTabProps) {

    return (
        <div className={'space-y-5'}>
            {model.algorithm === "logistic_regression" && <LogisticRegMetrics model={model}/>}
            {model.algorithm === "linear_regression" && <LinearRegMetrics model={model}/>}
        </div>
    )
}