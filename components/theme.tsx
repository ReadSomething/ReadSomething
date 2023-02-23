import React, { useContext } from "react";
import { SettingContext, ThemeMode } from "~provider/setting";

export default function Theme () {
    const { settingObject: { themeMode }, setSetting } = useContext(SettingContext);

    return <div className={"setting fixed select-none right-[180px] top-[30px]"}>
        {
            Object.keys(ThemeMode).map(item => {
                return <div
                    className={`themeModeRadio cursor-pointer ${themeMode === ThemeMode[item] ? 'selected' : ''}`}
                    onClick={async () => {
                        await setSetting({ themeMode: ThemeMode[item] })
                    }}
                    key={item}>
                    {item}
                </div>

            })
        }
    </div>
}
