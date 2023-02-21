import type { Dispatch, SetStateAction } from "react";

export const getLatestState = function<T> (dispatch: Dispatch<SetStateAction<T>>):Promise<T> {
    return new Promise<T>( (resolve) => {
        dispatch(prevState => {
            resolve(prevState)

            return prevState
        })
    })
}
