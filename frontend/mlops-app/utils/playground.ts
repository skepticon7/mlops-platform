export const getTypeInput = (dType: string) : "number" | "text" | "select" => {
    if(dType.includes("numeric")) return "number";
    if(dType.includes("text") || dType.includes("categorical")) return "text";
    return "text";
}


