import api from "@/lib/api"
import {ModelPaginationResponse} from "@/types/model.types";
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
    }
}