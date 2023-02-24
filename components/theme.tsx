import React, { useContext } from "react";
import { SettingContext, ThemeMode } from "~provider/setting";
import IconThemeLight from "data-base64:~assets/theme-light.svg"
import IconThemeDark from "data-base64:~assets/theme-dark.svg"
import IconThemeAutoLight from "data-base64:~assets/theme-auto-light.svg"
import { Transition } from "@headlessui/react";
// import Tooltip from "~components/tooltip";
// import IconThemeAutoDark from "react:~/assets/theme-auto-dark.svg"

export default function Theme () {
    const { settingObject: { themeMode }, setSetting } = useContext(SettingContext);

    const modeKey = Object.keys(ThemeMode)

    const getIcon = function (theme: ThemeMode) {
        switch (theme) {
        case ThemeMode.Auto:
            return IconThemeAutoLight
        case ThemeMode.Light:
            return IconThemeLight
        case ThemeMode.Dark:
            return IconThemeDark
        }
    }

    return <div className={'setting fixed w-[24px] h-[24px] select-none right-[180px] top-[30px]'}>
        <div className={"flex flex-wrap "}>
            {
                modeKey.map((item, index) => {
                    return <Transition
                        enter="transition-all duration-100"
                        enterFrom="opacity-0 translate-y-[-30px]"
                        enterTo="opacity-[1] translate-y-[0]"
                        leave="duration-0"
                        leaveFrom="opacity-1 mr-[0]"
                        leaveTo="opacity-0 translate-x-[30px]"
                        show={ThemeMode[item] === themeMode}
                    >
                        <div
                            className={`themeModeRadio cursor-pointer ${themeMode === ThemeMode[item] ? 'selected' : ''}`}
                            onClick={(e) => {
                                console.log(e)
                                e.preventDefault();
                                e.stopPropagation()
                                console.log(ThemeMode[item])
                                void setSetting({ themeMode: ThemeMode[modeKey[(index + 1) % 3]] })
                            }}
                            key={item}>
                            <img src={getIcon(ThemeMode[item])} alt={item}/>
                        </div>
                    </Transition>
                })
            }
        </div>
    </div>
}
