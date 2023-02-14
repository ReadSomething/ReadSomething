import {ReactNode, useContext} from "react";
import {SettingContext} from "~provider/setting";
import {Popover} from "@headlessui/react";
import {EnumTheme} from "~content";
import ReactSlider from "react-slider";
import FontSizeLeft from "data-base64:~assets/font-size-left.svg"
import FontSizeRight from "data-base64:~assets/font-size-right.svg"
import PageWidthLeft from "data-base64:~assets/page-width-left.svg"
import PageWidthRight from "data-base64:~assets/page-width-right.svg"

export enum EnumLineSpacing {
    Small = '1.3em',
    Medium = '1.6em',
    Large = '2.2em'
}

function SettingItem({label, children}: { label: string, children: ReactNode }) {
    return <div className={'flex'}>
        <div className={'w-[120px]'}>
            {label}
        </div>
        <div className={'flex-1'}>
            {children}
        </div>
    </div>
}

function VGap({size = 0}: { size: number }) {
    return <div className={'w-full'} style={{height: `${Math.max(size, 0)}px`}}/>
}

function LineSpacing() {
    const {settingObject: {lineSpacing}, setLineSpacing} = useContext(SettingContext);

    return <div className={'lineSpacingRadioGroup'}>
        {
            Object.keys(EnumLineSpacing).map(item => {
                return  <div className={'lineSpacingRadio'} onClick={() => setLineSpacing(EnumLineSpacing[item])} key={item}>
                    <span className={`circle ${lineSpacing === EnumLineSpacing[item] ? 'selected' : ''}`}/> {item}
                </div>
            })
        }
    </div>
}

export function BasicSetting() {
    const {settingObject: {fontSize, pageWidth}, setTheme, setFontSize, setPageWidth} = useContext(SettingContext);
    const showSetting = function () {

    }

    // @ts-ignore
    return <div onClick={showSetting} className={'setting fixed select-none right-[20px] top-[20px] cursor-pointer'}>
        <div>
            <Popover>
                <Popover.Button>Setting</Popover.Button>
                <Popover.Panel className="fixed right-[20px] top-[60px]">
                    {
                        <div
                            className='bg-[var(--setting-background)] text-[var(--setting-foreground)] w-[360px] p-[18px] h-[300px] '>
                            <SettingItem label={'Font'}>
                                hello
                            </SettingItem>
                            <VGap size={14}/>
                            <SettingItem label={'Font Size'}>
                                <div className={'flex items-center'}>
                                    <img className={'h-[20px] mr-[6px]'} src={FontSizeLeft} alt=""/>
                                    <div className={'h-[18px] flex-1 items-center'}>
                                        {/*// @ts-ignore*/}
                                        <ReactSlider max={40} min={12} defaultValue={fontSize}
                                                     className="horizontal-slider mt-[2px] setting-font-size"
                                                     thumbClassName="thumb"
                                                     trackClassName="track"
                                                     onChange={setFontSize}
                                                     renderThumb={(props, state) =>
                                                         <div {...props}>{state.valueNow}</div>}
                                        />
                                    </div>
                                    <img className={'h-[20px] ml-[6px]'} src={FontSizeRight} alt=""/>
                                </div>
                            </SettingItem>
                            <VGap size={14}/>
                            <SettingItem label={'Line spacing'}>
                                <LineSpacing/>
                            </SettingItem>
                            <VGap size={14}/>
                            <SettingItem label={'Page width'}>
                                <div className={'flex items-center'}>
                                    <img src={PageWidthLeft} className={'h-[18px] mr-[6px]'} alt=""/>
                                    <div className={'h-[18px] flex-1  items-center'}>
                                        {/*@ts-ignore*/}
                                        <ReactSlider defaultValue={pageWidth}
                                                     max={1200} min={400}
                                                     className="horizontal-slider mt-[2px] w-full setting-font-size"
                                                     thumbClassName="thumb"
                                                     trackClassName="track"
                                                     onChange={setPageWidth}
                                                     renderThumb={(props, state) =>
                                                         <div {...props}>{state.valueNow}</div>}
                                        />
                                    </div>
                                    <img src={PageWidthRight} className={'h-[18px] ml-[6px]'} alt=""/>
                                </div>
                            </SettingItem>
                        </div>
                    }
                </Popover.Panel>
            </Popover>
        </div>
    </div>
}
