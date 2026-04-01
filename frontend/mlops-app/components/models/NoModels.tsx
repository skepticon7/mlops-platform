import {BrainCircuit, Plus} from "lucide-react";
import {useRouter} from "next/navigation";

export default function NoModels({onAction} : {onAction : () => void}) {
    const router = useRouter();
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BrainCircuit size={36} className="text-text-secondary"/>
            <p className="text-[14px] font-medium text-text-primary">No models yet</p>
            <p className="text-[13px] text-text-secondary">Train your first model to get started</p>
            <button
                onClick={onAction}
                className="inline-flex items-center gap-[6px] px-[14px] py-[6px] rounded-[6px] text-[13px] font-medium bg-[#ededed] text-black cursor-pointer transition-colors duration-120 hover:bg-[#ddd] mt-1"
            >
                <Plus size={13}/>
                Train New Model
            </button>
        </div>
    )
}