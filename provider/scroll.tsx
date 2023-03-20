import React, { createContext, ReactNode } from "react";

interface ScrollObject {
}

export const ScrollContext = createContext({} as ScrollObject);

export function ScrollProvider ({ children }: { children: ReactNode }) {

    return (
        <ScrollContext.Provider
            value={{}}>
            {children}
        </ScrollContext.Provider>
    );
}
