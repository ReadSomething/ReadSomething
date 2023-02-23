import { createContext, type ReactNode, useEffect, useMemo, useState } from "react";
import { EnumTheme } from "~content";
import { Storage } from "@plasmohq/storage";
import { EnumLineSpacing, Fonts, TencentTranslateServicesKey, TranslateServices } from "~components/setting";
import { getLatestState } from "~utils/state";

export enum ThemeMode {
    Light = 'light',
    Dark = 'dark',
    Auto = 'auto'
}

interface SettingObject {
    fontSize?: number;
    theme?: EnumTheme;
    pageWidth?: number;
    lineSpacing?: EnumLineSpacing;
    fontFamily?: string;
    translateService?: string;
    themeMode?: ThemeMode;
}

interface TypeSettingContext {
    settingObject: SettingObject;
    setSetting: (value: SettingObject) => Promise<void>;
}

export const SettingContext = createContext({} as TypeSettingContext);

const SettingStorageKey = "__READSOMETHING_SETTING_V1";

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
            theme = EnumTheme.Heti,
            pageWidth = 800,
            lineSpacing = EnumLineSpacing.Medium,
            fontFamily = Fonts[0],
            translateService = TranslateServices[TencentTranslateServicesKey],
            themeMode = ThemeMode.Auto;

        try {
            const setting = JSON.parse(await storage.get(SettingStorageKey));

            if (setting) {
                const {
                    fontSize: _fontSize,
                    theme: _theme,
                    pageWidth: _pageWidth,
                    lineSpacing: _lineSpacing,
                    fontFamily: _fontFamily,
                    translateService: _translateService,
                    themeMode: _themeMode
                } = setting;

                if (_fontSize) fontSize = _fontSize;
                if (_theme) theme = _theme;
                if (_pageWidth) pageWidth = _pageWidth;
                if (_lineSpacing) lineSpacing = _lineSpacing;
                if (_fontFamily) fontFamily = _fontFamily;
                if (_translateService) translateService = _translateService;
                if (_themeMode) themeMode = _themeMode;
            }
        } catch (e) {
            // ignore
            console.error(e);
        } finally {
            await _setData({ fontSize, theme, pageWidth, lineSpacing, fontFamily, translateService, themeMode });
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
