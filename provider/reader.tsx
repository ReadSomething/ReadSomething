import {createContext, ReactNode, useEffect, useMemo, useState} from "react";
import {EnumTheme} from "~content";

interface TypeReaderContext {
    settingStatus: boolean
    setSettingStatus: (value: boolean) => void
}


export const ReaderContext = createContext({} as TypeReaderContext)

export function ReaderProvider({children}: { children: ReactNode }) {
    const [settingStatus, setSettingStatus] = useState(false);

    return <ReaderContext.Provider value={{
        settingStatus,
        setSettingStatus,
    }}>
        {children}
    </ReaderContext.Provider>
}
