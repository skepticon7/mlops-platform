import {useReducer, useEffect, useCallback} from "react";

interface FetchState<T>{
    data : T | null;
    error : string | null;
    loading : boolean
}


type FetchAction<T> =
    | { type: "LOADING" }
    | { type: "SUCCESS"; payload: T }
    | { type: "ERROR"; payload: string }


function fetchReducer<T>(state : FetchState<T> , action : FetchAction<T>) : FetchState<T> {
    switch(action.type) {
        case "LOADING" : return {data : null , error : null , loading: true}
        case "SUCCESS" : return {data : action.payload , error : null , loading : false}
        case "ERROR" : return {data : null , error : action.payload , loading : false}
    }
}

export function useFetch<T>(
    fetcher: () => Promise<{ data: T }>,
    deps: unknown[] = [],
    onSuccess?: () => void,
    onError?: () => void
) {
    const [state, dispatch] = useReducer(fetchReducer<T>, {
        data: null,
        error: null,
        loading: true,
    })

    const execute = useCallback(() => {
        let canceled = false
        dispatch({ type: "LOADING" })

        fetcher()
            .then(({ data }) => {
                if (!canceled) {
                    onSuccess?.()
                    dispatch({ type: "SUCCESS", payload: data })
                }
            })
            .catch((err) => {
                if (!canceled) {
                    onError?.()
                    dispatch({ type: "ERROR", payload: err })
                }
            })

        return () => { canceled = true }
    }, deps)

    useEffect(() => {
        return execute()
    }, [execute])

    return { ...state, refetch: execute }
}
