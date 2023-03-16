import React, { ReactNode, createContext, useState } from "react"

interface ScrollObject {
    scrollRef: React.RefObject<HTMLDivElement>
    scrollX: number
    setScrollX: (value: number) => void
    scrollY: number
    setScrollY: (value: number) => void
}

export const ScrollContext = createContext({} as ScrollObject)

export function ScrollProvider ({ children }: { children: ReactNode }) {
    const scrollRef = React.createRef<HTMLDivElement>()
    const [scrollX, setScrollX] = useState(0)
    const [scrollY, setScrollY] = useState(0)

    return (
        <ScrollContext.Provider
            value={{
                scrollRef,
                scrollX,
                setScrollX,
                scrollY,
                setScrollY,
            }}>
            {children}
        </ScrollContext.Provider>
    )
}
