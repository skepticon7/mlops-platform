import api from "@/lib/api"
import {ModelPaginationResponse, ModelResponse} from "@/types/models.types";


export const modelsService = {
    getModels :  (page : number) => {
        return api.get<ModelPaginationResponse>("/model/getModels" , {params : {page}})
    },
    deleteModel : (model_id : string) => {
        return api.delete<void>(`/model/deleteModel/${model_id}`)
    }
}