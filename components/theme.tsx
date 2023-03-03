import React, { useContext } from "react";
import { SettingContext, ThemeMode } from "~provider/setting";
import IconThemeLight from "data-base64:~assets/theme-light.svg";
import IconThemeDark from "data-base64:~assets/theme-dark.svg";
import IconThemeAuto from "data-base64:~assets/theme-auto.svg";
import { Transition } from "@headlessui/react";
import Tooltip from "./tooltip";

export default function Theme () {
    const { settingObject: { themeMode }, setSetting } = useContext(SettingContext);

    const modeKey = Object.keys(ThemeMode);

    const getIcon = function (theme: ThemeMode) {
        switch (theme) {
        case ThemeMode.Auto:
            return IconThemeAuto;
        case ThemeMode.Light:
            return IconThemeLight;
        case ThemeMode.Dark:
            return IconThemeDark;
        }
    };

    return <div className={"setting select-none"}>
        <div className={"flex flex-wrap "}>
            <Tooltip key={"theme"} message={"Theme"}>
                {
                    modeKey.map((item, index) => {
                        return <Transition
                            enter="transition-all duration-300"
                            enterFrom="opacity-0 translate-y-[0]"
                            enterTo="opacity-[1] translate-y-[0]"
                            leave="duration-0"
                            leaveFrom="opacity-1 mr-[0]"
                            leaveTo="opacity-0 translate-x-[30px]"
                            show={ThemeMode[item] === themeMode}
                            key={item}
                        >
                            <button
                                className={`themeModeRadio cursor-pointer ${themeMode === ThemeMode[item] ? "selected" : ""}`}
                                onClick={(e) => {
                                    console.log(e);
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log(ThemeMode[item]);
                                    void setSetting({ themeMode: ThemeMode[modeKey[(index + 1) % 3]] });
                                }}
                            >
                                <img src={getIcon(ThemeMode[item])} alt={item} />
                            </button>
                        </Transition>;
                    })
                }
            </Tooltip>
        </div>
    </div>;
}
