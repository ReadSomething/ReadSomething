import React, { ReactNode, useContext } from "react";
import { SettingContext } from "~provider/setting";
import { Popover } from "@headlessui/react";
import ReactSlider from "react-slider";
import FontSizeLeft from "data-base64:~assets/font-size-left.svg";
import FontSizeRight from "data-base64:~assets/font-size-right.svg";
import PageWidthLeft from "data-base64:~assets/page-width-left.svg";
import PageWidthRight from "data-base64:~assets/page-width-right.svg";
import IconSetting from "react:~/assets/setting-config.svg";
import ToolTip from "~components/toolTip";


export enum EnumLineSpacing {
  Small = "1.4em",
  Medium = "1.8em",
  Large = "2.4em"
}

export const Fonts = [
    "Default",
    "Arial",
    "Arial Black",
    "Athelas",
    "Bookerly",
    "Chakra Petch",
    "Comic Sans",
    "Comic Sans MS",
    "Constantia",
    "Courier New",
    "Courier",
    "Didot",
    "Fira Code",
    "Georgia",
    "Gill Sans",
    "IBM Plex Sans",
    "Impact",
    "Iowan Old Style",
    "Palatino",
    "Optima",
    "Sans-serif",
    "Seravek",
    "Serif",
    "Sitka Text",
    "Times New Roman",
    "Trebuchet MS"
]

function SettingItem({ label, children }: { label: string, children: ReactNode }) {
  return <div className={"flex items-center"}>
    <div className={"w-[120px]"}>
      {label}
    </div>
    <div className={"flex-1"}>
      {children}
    </div>
  </div>;
}

function VGap({ size = 0 }: { size: number }) {
  return <div className={"w-full"} style={{ height: `${Math.max(size, 0)}px` }} />;
}

function LineSpacing() {
  const { settingObject: { lineSpacing }, setSetting } = useContext(SettingContext);

  return <div className={"lineSpacingRadioGroup"}>
    {
      Object.keys(EnumLineSpacing).map(item => {
        return <div className={"lineSpacingRadio"}
                    onClick={() => setSetting({ lineSpacing: EnumLineSpacing[item] })}
                    key={item}>
          <span className={`circle ${lineSpacing === EnumLineSpacing[item] ? "selected" : ""}`} /> {item}
        </div>;
      })
    }
  </div>;
}

function FontSelect() {
  const { settingObject: { fontFamily }, setSetting } = useContext(SettingContext);

  const selectFontChange = function(e: React.ChangeEvent<HTMLSelectElement>) {
    void setSetting({ fontFamily: e.target.value });
  };

  return (
    <select onChange={selectFontChange} value={fontFamily}
            className={"text-[var(--setting-foreground)] text-[12px] outline-none p-[4px] bg-[white]"} name="fonts"
            id="fonts">
      {
        Fonts.map(item => <option key={item} value={item}>{item}</option>)
      }
    </select>
  );
}

export function BasicSetting() {
  const { settingObject: { fontSize, pageWidth }, setSetting } = useContext(SettingContext);
  const showSetting = function() {

  };

    // @ts-ignore
    return <div onClick={showSetting} className={'setting fixed select-none right-[30px] top-[30px] select-none'}>
        <div>
            <Popover>
                <ToolTip delayShow={1000} message={'Settings'}>
                    <div>
                        <Popover.Button data-tooltip-id="my-tooltip"  className={'outline-none'}><IconSetting/></Popover.Button>
                    </div>
                </ToolTip>
                <Popover.Panel className="fixed right-[20px] top-[60px]">
                    {
                        <div
                            className='rounded-[4px] bg-[var(--setting-background)] text-[var(--setting-foreground)] w-[360px] p-[18px] '>
                            <SettingItem label={'Font'}>
                                <FontSelect/>
                            </SettingItem>
                            <VGap size={14}/>
                            <SettingItem label={'Font size'}>
                                <div className={'flex items-center'}>
                                    <img className={'h-[20px] mr-[6px]'} src={FontSizeLeft} alt=""/>
                                    <div className={'h-[18px] flex-1 items-center'}>
                                        {/*// @ts-ignore*/}
                                        <ReactSlider max={40} min={12} defaultValue={fontSize}
                                                     className="horizontal-slider mt-[2px] setting-font-size"
                                                     thumbClassName="thumb"
                                                     trackClassName="track"
                                                     onChange={(value) => setSetting({fontSize: value})}
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
                                                     onChange={(value) => setSetting({pageWidth: value})}
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
