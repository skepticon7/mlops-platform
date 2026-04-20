import {LinearRegressionMetrics, LogisticRegressionMetrics, ModelDetailResponse} from "@/types/model.types";
import {formatMetrics} from "@/utils/metrics";
import LogisticRegMetrics from "../model/logitsticRegression/LogisticRegressionMetrics"
import React from "react";


interface MetricsTabProps {
    model : ModelDetailResponse
}

export default function MetricsTab({model} : MetricsTabProps) {

    return (
        <div className={'space-y-5'}>
            {model.algorithm === "logistic_regression" && <LogisticRegMetrics model={model}/>}
        </div>
    )
}