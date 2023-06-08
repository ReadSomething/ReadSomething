import { createContext, type ReactNode, useEffect, useMemo, useState } from "react";
import { Storage } from "@plasmohq/storage";
import { EnumLineSpacing, EnumTranslateServices, Fonts } from "~components/setting";
import { getLatestState } from "~utils/state";

export enum ThemeMode {
    Auto = 'auto',
    Light = 'light',
    Dark = 'dark',
}

interface SettingObject {
    fontSize?: number;
    pageWidth?: number;
    lineSpacing?: EnumLineSpacing;
    fontFamily?: string;
    translateService?: string;
    themeMode?: ThemeMode;
    openaiKey?: string;
}

interface TypeSettingContext {
    settingObject: SettingObject;
    setSetting: (value: SettingObject) => Promise<void>;
}

export const SettingContext = createContext({} as TypeSettingContext);

const SettingStorageKey = "__READSOMETHING_SETTING_V3";

export default function SettingProvider ({ children }: { children: ReactNode }) {
    const [settingObject, setSettingObject] = useState({} as SettingObject);
    const storage = useMemo(() => new Storage(), []);

    const _setData = async function (data: SettingObject) {
        setSettingObject({ ...Object.assign(settingObject, data) });
        const _settingObject = await getLatestState(setSettingObject);
        await storage.set(SettingStorageKey, JSON.stringify(_settingObject));
    };

    const init = async function () {
        let fontSize = 18,
            pageWidth = 800,
            lineSpacing = EnumLineSpacing.Medium,
            fontFamily = Fonts[4],  // Bookerly
            translateService = EnumTranslateServices.GoogleTranslate,
            themeMode = ThemeMode.Auto,
            openaiKey = '';

        try {
            const setting = JSON.parse(await storage.get(SettingStorageKey));

            if (setting) {
                const {
                    fontSize: _fontSize,
                    pageWidth: _pageWidth,
                    lineSpacing: _lineSpacing,
                    fontFamily: _fontFamily,
                    translateService: _translateService,
                    themeMode: _themeMode,
                    openaiKey: _openaiKey
                } = setting;

                if (_fontSize) fontSize = _fontSize;
                if (_pageWidth) pageWidth = _pageWidth;
                if (_lineSpacing) lineSpacing = _lineSpacing;
                if (_fontFamily) fontFamily = _fontFamily;
                if (_translateService) translateService = _translateService;
                if (_themeMode) themeMode = _themeMode;
                if (_openaiKey) openaiKey = _openaiKey;
            }
        } catch (e) {
            // ignore
            console.error(e);
        } finally {
            await _setData({ fontSize, pageWidth, lineSpacing, fontFamily, translateService, themeMode, openaiKey });
        }
    };

    const setSetting = async function (setting: SettingObject) {
        await _setData(setting);
    };

    useEffect(() => {
        void init();
    }, []);

    return <SettingContext.Provider value={{
        settingObject,
        setSetting
    }}>
        {children}
    </SettingContext.Provider>;
}
