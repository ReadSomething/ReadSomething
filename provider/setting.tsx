import {createContext, ReactNode, useEffect, useMemo, useState} from "react";
import {EnumTheme} from "~content";
import {Storage} from "@plasmohq/storage";

interface SettingObject {
    fontSize?: number
    theme?: EnumTheme
}

interface TypeSettingContext {
    settingObject: SettingObject,
    setTheme: (theme: EnumTheme) => Promise<void>,
    setFontSize: (value: number) => Promise<void>
}

export const SettingContext = createContext({} as TypeSettingContext)

const SettingStorageKey = '__READSOMETHING_SETTING_V1'

export default function SettingProvider({children}: { children: ReactNode }) {
    const [settingObject, setSettingObject] = useState({} as SettingObject);
    const storage = useMemo(() => new Storage(), []);

    const _setData = async function (data: SettingObject) {
        setSettingObject({...Object.assign(settingObject, data)})

        await storage.set(SettingStorageKey, JSON.stringify(settingObject))
    }

    const init = async function () {
        let fontSize = 16
        let theme = EnumTheme.Heti

        try {
            const setting = JSON.parse(await storage.get(SettingStorageKey))

            if (setting) {
                const {fontSize: _fontSize, theme: _theme} = setting

                if (fontSize) fontSize = _fontSize
                if (theme) theme = _theme
            }
        } catch (e) {
            // ignore
        } finally {
            await _setData({fontSize, theme})
        }
    }

    const setTheme = async function (theme: EnumTheme) {
        console.log('----------------', theme)
        await _setData({theme})
    }

    const setFontSize = async function (fontSize: number) {
        await _setData({fontSize})
    }

    useEffect(() => {
        void init()
    }, []);

    return <SettingContext.Provider value={{
        settingObject,
        setTheme,
        setFontSize
    }}>
        {children}
    </SettingContext.Provider>
}
