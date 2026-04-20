import {ModelDetailResponse} from "@/types/model.types";

export const formatMetrics = (model : ModelDetailResponse) =>   {
        let m;
        switch (model.algorithm) {
            case 'logistic_regression':
                m = model.metrics;
                return {
                    "precision" : (m.precision * 100).toFixed(1) + "%",
                    "f1-score" : (m.f1 * 100).toFixed(1) + "%",
                    "recall" : (m.recall * 100).toFixed(1) + "%",
                    "accuracy" : (m.accuracy * 100).toFixed(1) + "%"
                }

            case "linear_regression":
                m = model.metrics;
                return {
                    "mse" : 55
                }

            default : return {};

        }
}