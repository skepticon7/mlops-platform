import {ModelDetailResponse} from "@/types/model.types";

export const formatMetrics = (model : ModelDetailResponse) =>   {
        let m;
        switch (model.algorithm) {
            case 'logistic_regression':
                m = model.metrics;
                return {
                    "precision" : ((m?.precision ?? 0) * 100).toFixed(1) + "%",
                    "f1-score" : ((m?.f1 ?? 0) * 100).toFixed(1) + "%",
                    "recall" : ((m?.recall ?? 0) * 100).toFixed(1) + "%",
                    "accuracy" : ((m?.accuracy ?? 0) * 100).toFixed(1) + "%"
                }

            case 'linear_regression':
                m = model.metrics;
                const test_r2 = m?.test_r2 ?? m?.r2 ?? 0;
                const test_mse = m?.test_mse ?? m?.mse ?? 0;
                const mae = m?.mae ?? 0;
                const rmse = m?.rmse ?? 0;
                const train_r2 = m?.train_r2 ?? 0;
                const train_mse = m?.train_mse ?? 0;
                const intercept = m?.intercept ?? 0;
                const coef_norm = m?.coef_norm ?? 0;
                const features_importance = m?.features_importance ?? {};

                return {
                    "test_r2" : test_r2.toFixed(3),
                    "test_mse" : test_mse.toFixed(3),
                    "mae" : mae.toFixed(3),
                    "rmse": rmse.toFixed(3),
                    "train_r2" : train_r2.toFixed(3),
                    "train_mse" : train_mse.toFixed(3),
                    "intercept" : intercept?.toFixed(3) || "N/A",
                    "coef_norm": coef_norm.toFixed(4),
                    "features_importance" : Object.entries(features_importance)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .map(([k, v]) => ({
                            feature: k,
                            importance: ((v as number) * 100).toFixed(1) + "%"
                        }))
                }

            case 'kmeans':
                m = model.metrics;
                return {
                   "inertia" : (m?.inertia ?? 0).toFixed(2),
                    "silhouette_score" : (m?.silhouette_score ?? 0).toFixed(3),
                    "davies_bouldin_score" : (m?.davies_bouldin_score ?? 0).toFixed(3),
                    "calinski_harabasz_score" : (m?.calinski_harabasz_score ?? 0).toFixed(3)
                }


            default : return {};

        }
}