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

            case 'linear_regression':
                m = model.metrics;
                return {
                    "test_r2" : m.test_r2.toFixed(3),
                    "test_mse" : m.test_mse.toFixed(3),
                    "mae" : m.mae.toFixed(3),
                    "rmse": m.rmse.toFixed(3),
                    "train_r2" : m.train_r2.toFixed(3),
                    "train_mse" : m.train_mse.toFixed(3),
                    "intercept" : m.intercept?.toFixed(3) || "N/A",
                    "coef_norm": m.coef_norm.toFixed(4),
                    "features_importance" : Object.entries(m.features_importance)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, v]) => ({
                            feature: k,
                            importance: (v * 100).toFixed(1) + "%"
                        }))
                }


            default : return {};

        }
}