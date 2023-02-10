import {useContext} from "react";
import {SettingContext} from "~provider/setting";
import {Popover} from "@headlessui/react";
import {EnumTheme} from "~content";

export function BasicSetting() {
    const {settingObject, setTheme} = useContext(SettingContext);
    const showSetting = function () {

    }

    return <div onClick={showSetting} className={'setting fixed select-none right-[20px] top-[20px] cursor-pointer'}>
        <div>
            <Popover>
                <Popover.Button>Setting</Popover.Button>
                <Popover.Panel className="fixed right-[20px] top-[60px]">
                    {
                        <div
                            className='bg-[var(--setting-background)] text-[var(--setting-foreground)] w-[300px] p-[10px] h-[300px] '>
                            <div className={'flex items-center'}>
                                <div>Font Size:</div>
                                <div><input
                                    className={'w-[40px] bg-[var(--setting-sub-background)] ml-[4px] mr-[4px] p-[2px] box-content outline-none border-[1px] border-transparent focus:border-[1px] focus:border-black'}
                                    type="text"/></div>
                                <div>px</div>
                            </div>
                            <div className={'flex items-center mt-[20px]'}>
                                <div>Theme:</div>
                                <div>
                                    {
                                        Object.keys(EnumTheme).map(item =>
                                            <button onClick={() => setTheme(EnumTheme[item])}
                                                    className={'px-[10px] py-[5px] ml-[10px] border mr-[10px]'}>{item}</button>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </Popover.Panel>
            </Popover>
        </div>
    </div>
}
