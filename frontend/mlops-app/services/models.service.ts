import api from "@/lib/api"
import {ModelPaginationResponse, PredictRequest, PredictResponse} from "@/types/model.types";
import {ModelDetailResponse} from "@/types/model.types";


export const modelsService = {
    getModels :  (page : number) => {
        return api.get<ModelPaginationResponse>("/model/getModels" , {params : {page}})
    },
    deleteModel : (model_id : string) => {
        return api.delete<void>(`/model/deleteModel/${model_id}`)
    },
    getModel: (model_id: string) => {
        return api.get<ModelDetailResponse>(`/model/getModel/${model_id}`)
    },
    predict : (model_id: string , predictionRequest: PredictRequest) => {
        return api.post<PredictResponse>(`/model/predict/${model_id}` , predictionRequest);
    }
}