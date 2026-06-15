import api from "@/lib/api"
import {ModelPaginationResponse, PredictRequest, PredictResponse, ModelResponse} from "@/types/model.types";
import {ModelDetailResponse} from "@/types/model.types";


export const modelsService = {
    getModels :  (page : number) => {
        return api.get<ModelPaginationResponse>("/model/getModels" , {params : {page}})
    },
    getCompletedModels : () => {
        return api.get<ModelResponse[]>("/model/completedModels")
    },
    deleteModel : (model_id : string) => {
        return api.delete<void>(`/model/deleteModel/${model_id}`)
    },
    getModel: (model_id: string) => {
        return api.get<ModelDetailResponse>(`/model/getModel/${model_id}`)
    },
    predict : (model_id: string , predictionRequest: PredictRequest) => {
        return api.post<PredictResponse>(`/model/predict/${model_id}` , predictionRequest);
    },
    trainModel: (formData: FormData) => {
        return api.post<{ task_id: string }>("/model/train", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
    getTaskStatus: (taskId: string) => {
        return api.get<{
            state: string;
            progress?: number;
            status?: string;
            error?: string;
        }>(`/model/task/${taskId}`);
    }
}