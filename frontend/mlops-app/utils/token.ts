export function getTokenPayload(token : string) {
    try{
        return JSON.parse(atob(token.split(".")[1]));
    }catch{
        return null;
    }
}


export function isTokenExpired(token: string) : boolean {
    const payload = getTokenPayload(token);
    if(!payload?.exp) return true;
    return Date.now() / 1000 > payload.exp
}

