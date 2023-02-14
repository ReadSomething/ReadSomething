import {createContext, ReactNode, useEffect, useMemo, useState} from "react";
import {EnumTheme} from "~content";
import {Storage} from "@plasmohq/storage";
import {EnumLineSpacing} from "~components/setting";

interface SettingObject {
    fontSize?: number
    theme?: EnumTheme
    pageWidth?: number
    lineSpacing?: EnumLineSpacing
}

interface TypeSettingContext {
    settingObject: SettingObject,
    setTheme: (theme: EnumTheme) => Promise<void>,
    setFontSize: (value: number) => Promise<void>,
    setPageWidth: (value: number) => Promise<void>,
    setLineSpacing: (value: EnumLineSpacing) => Promise<void>
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
        let fontSize = 18
        let theme = EnumTheme.Heti
        let pageWidth = 800
        let lineSpacing = EnumLineSpacing.Medium

        try {
            const setting = JSON.parse(await storage.get(SettingStorageKey))

            if (setting) {
                const {fontSize: _fontSize, theme: _theme, pageWidth: _pageWidth, lineSpacing: _lineSpacing} = setting

                if (_fontSize) fontSize = _fontSize
                if (_theme) theme = _theme
                if (_pageWidth) pageWidth = _pageWidth
                if (_lineSpacing) lineSpacing = _lineSpacing
            }
        } catch (e) {
            // ignore
        } finally {
            await _setData({fontSize, theme, pageWidth, lineSpacing})
        }
    }

    const setTheme = async function (theme: EnumTheme) {
        await _setData({theme})
    }

    const setFontSize = async function (fontSize: number) {
        await _setData({fontSize})
    }

    const setPageWidth = async function (pageWidth: number) {
        await _setData({pageWidth})
    }

    const setLineSpacing = async function (lineSpacing: EnumLineSpacing) {
        await _setData({lineSpacing})
    }

    useEffect(() => {
        void init()
    }, []);

    return <SettingContext.Provider value={{
        settingObject,
        setTheme,
        setFontSize,
        setPageWidth,
        setLineSpacing
    }}>
        {children}
    </SettingContext.Provider>
}
