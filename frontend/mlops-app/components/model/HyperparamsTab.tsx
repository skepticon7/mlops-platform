import {ModelDetailResponse} from "@/types/model.types";
import LogisticRegHyperparams from "@/components/model/logitsticRegression/LogisticRegressionHyperparams";

interface HyperparamsTabProps {
    model : ModelDetailResponse
}

export default function HyperparamsTab({model} : HyperparamsTabProps) {

    return (
        <div className={'w-full'}>
            {model.algorithm === "logistic_regression" && <LogisticRegHyperparams model={model}/>}
        </div>
    )

}