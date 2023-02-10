import {Readability} from "@mozilla/readability";
import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import styleText from "data-text:./content.scss"
import type {PlasmoGetStyle} from "plasmo"
import readingTime from 'reading-time/lib/reading-time'
import hljs from 'highlight.js';
import type {GptRes} from "~bean/GptRes";
import HelperIcon from "data-base64:~assets/talk.svg"
import CloseIcon from "data-base64:~assets/close.svg"
import {Popover} from "@headlessui/react";
import { Storage } from "@plasmohq/storage"

const theStorage = new Storage()

// a plasmo hook
export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    style.textContent = styleText
    return style
}

const getMetaContentByProperty = function (metaProperty: string) {
    const metas = document.getElementsByTagName('meta');

    for (let i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute('property') === metaProperty) {
            return metas[i].getAttribute('content');
        }
    }

    return '';
}

const isValidUrl = urlString => {
    try {
        return Boolean(new URL(urlString));
    } catch (e) {
        return false;
    }
}

const riskStringEscape = function (text: string) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function parseGptData(str: string): string | null {
    try {
        const data: GptRes = JSON.parse(str)

        if (data.message.toLowerCase() === 'ok') return data.data

        return null
    } catch (e) {
        return null
    }
}

class Settings {
    #key: string
    #storage: Storage
    fontSize: string
    setFontSize() {

    }

    async #getStorage() {
        return await this.#storage.get(this.#key)
    }

    async #setStorage(data: string) {
        await this.#storage.set(this.#key, data)
    }

    getProperties() {
        return {
            fontSize: this.fontSize
        }
    }
    constructor(theStorageInstance:  Storage) {
        this.#storage = theStorageInstance
    }
}

enum EnumTheme {
    Standard = 'standard',
    Heti = 'Heti',
    HetiA = 'HetiA'
}

interface TypeReaderContext {
    settingStatus: boolean
    setSettingStatus: (value: boolean) => void

    theme: EnumTheme
    setTheme: (value: EnumTheme) => void
}

const ReaderContext = createContext({} as TypeReaderContext)

function Author({link, author}: { link: string, author: string }) {
    if (!author) return null

    let authorNode = <span>{author}</span>

    if (isValidUrl(link)) authorNode =
        <a href={link} style={{color: 'inherit', textDecoration: 'none'}} target={'_blank'}>{author}</a>

    return <div className="credits reader-credits">{authorNode}</div>
}

function HelpIcon() {
    // const {helperStatus, setHelperStatus} = useContext(HelperContext);
    //
    // return <div className='w-[40px] h-[40px]' onClick={() => setHelperStatus(!helperStatus)}>
    //     <div className={`
    //         w-[40px]
    //         h-[80px]
    //         absolute
    //         ${helperStatus ? 'grayscale-0' : 'grayscale'}
    //         hover:grayscale-0
    //     `}>
    //         <img src={helperStatus ? CloseIcon : HelperIcon} className='icon w-[40px] h-[40px] cursor-pointer ' alt=""/>
    //     </div>
    // </div>
}

function MessageBox() {
    return <div className={'bg-white rounded-r-[20px] text-black w-[60%] p-[10px] border-box'}> I will fade in and out I
        will fade in and out I will fade in and out</div>
}

// function ChatBox() {
//     const {helperStatus} = useContext(HelperContext);
//
//     return <div className={'absolute right-0 bottom-[60px] rounded-[10px] overflow-hidden'}>
//         <Transition
//             show={helperStatus}
//             enter="transition-all ease-in-out duration-300"
//             enterFrom="opacity-0 w-[0] h-[0]"
//             enterTo={`opacity-100 w-[300px] h-[300px]`}
//             leave="transition-all ease-in-out duration-300"
//             leaveFrom="opacity-0 w-[300px] h-[300px]"
//             leaveTo="opacity-0 w-[0] h-[0]"
//         >
//             <div>
//                 <div className='bg-amber-500 w-[300px] h-[300px] rounded-[10px]'>
//                     <MessageBox/>
//                     <input type="text"/>
//                 </div>
//             </div>
//         </Transition>
//     </div>
// }

function SelectionTip() {
    const plasmoRoot = document.querySelectorAll('plasmo-csui')[0].shadowRoot
    const plasmoContainer = plasmoRoot.querySelector('#plasmo-shadow-container')

    const onMouseUp = function (e) {
        const selection = window.getSelection()

        const start = selection.anchorOffset;
        const end = selection.focusOffset;
        // const range = selection.getRangeAt(0).cloneRange();
        // range.collapse(false);
        //
        // // Create the marker element containing a single invisible character using DOM methods and insert it
        // const markerEl = document.createElement("span");
        // markerEl.id = 'hello';
        // plasmoContainer.appendChild(document.createTextNode('good day'));
        // range.insertNode(markerEl);


        console.log('hello', start, end)
    }

    useEffect(() => {
        plasmoContainer.addEventListener('mouseup', onMouseUp)

        return () => {
            plasmoContainer.removeEventListener('mouseup', onMouseUp)
        }
    }, []);

    return <div></div>
}

function BasicSetting() {
    const {settingStatus, setSettingStatus, setTheme} = useContext(ReaderContext);

    const showSetting = function () {

    }

    return <div onClick={showSetting} className={'fixed select-none right-[20px] top-[20px] cursor-pointer'}>
        <div>
            {/*<div onClick={() => setSettingStatus(!settingStatus)}>*/}
            {/*    Setting*/}
            {/*</div>*/}

            {/*<div className={'fixed right-[20px] top-[60px] text-[14px] text-[var(--setting-foreground)]'}>*/}
            {/*    */}
            {/*</div>*/}

            <Popover >
                <Popover.Button>Setting</Popover.Button>

                <Popover.Panel className="fixed right-[20px] top-[60px]">
                    {
                         <div className='bg-[var(--setting-background)] text-[var(--setting-foreground)] w-[300px] p-[10px] h-[300px] '>
                            <div className={'flex items-center'}>
                                <div>Font Size:</div>
                                <div><input className={'w-[40px] bg-[var(--setting-sub-background)] ml-[4px] mr-[4px] p-[2px] box-content outline-none border-[1px] border-transparent focus:border-[1px] focus:border-black'} type="text"/></div>
                                <div>px</div>
                            </div>
                            <div className={'flex items-center mt-[20px]'}>
                                <div>Theme:</div>
                                <div>
                                    {
                                        Object.keys(EnumTheme).map(item =>
                                            <button onClick={() => setTheme(EnumTheme[item])} className={'px-[10px] py-[5px] ml-[10px] border mr-[10px]'}>{item}</button>
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

function ReaderProvider({children}: { children: ReactNode }) {
    const [settingStatus, setSettingStatus] = useState(false);

    const [theme, setTheme] = useState(EnumTheme.Heti);

    return <ReaderContext.Provider value={{
        settingStatus,
        setSettingStatus,
        theme,
        setTheme
    }}>
        {children}
    </ReaderContext.Provider>
}

// function HelperProvider({children}: { children: ReactNode }) {
//     const [helperStatus, setHelperStatus] = useState(false);
//
//     return <HelperContext.Provider value={{
//         helperStatus,
//         setHelperStatus
//     }}>
//         {children}
//     </HelperContext.Provider>
// }


// function SettingHelper() {
//     return <HelperProvider>
//         <div className='helper fixed bottom-[30px] right-[30px]'>
//             <ChatBox/>
//             <HelpIcon/>
//         </div>
//     </HelperProvider>
// }

function ThemeWrap({children}: {children: ReactNode}) {
    const {theme} = useContext(ReaderContext);

    let themeClass = ''

    switch (theme) {
        case EnumTheme.Standard:
            break
        case EnumTheme.Heti:
            themeClass = 'heti heti--classic'
            break
    }

    return <div className={themeClass}>
        {children}
    </div>
}

function Main() {
    useEffect(() => {
        const defaultOverflowStyle = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = defaultOverflowStyle
        }
    }, []);

    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone as Document, {
        keepClasses: true
    }).parse();
    const articleUrl = window.location.href;
    const author = article.byline ?? ""
    const authorLink = getMetaContentByProperty('article:author')
    const domain = window.location.hostname
    const timeToReadStr = readingTime(article.textContent).text

    return <ReaderProvider>
        {/*@ts-ignore*/}
        <div style={{"--font-size": "18px", "--content-width": "50em"}}
             className={'ReadSomething'}>
            <ThemeWrap>
                <div className={'fixed h-full  w-full overflow-scroll left-0 top-0'} style={{
                    backgroundColor: "var(--main-background)"
                }}>
                    <div className={'container'}>
                        <div className="header reader-header reader-show-element">
                            <a className="domain reader-domain"
                               href={articleUrl}>{domain}</a>
                            <div className="domain-border"></div>
                            <h1 className="reader-title">{article.title}</h1>
                            <Author link={authorLink} author={author}/>
                            <div className="meta-data">
                                <div className="reader-estimated-time" data-l10n-id="about-reader-estimated-read-time"
                                     data-l10n-args="{&quot;range&quot;:&quot;3–4&quot;,&quot;rangePlural&quot;:&quot;other&quot;}"
                                     dir="ltr">{timeToReadStr}
                                </div>
                            </div>
                        </div>
                        <hr/>
                        <div className={'content'}>
                            <div className={`mozReaderContent readerShowElement`}>
                                <div className='page' dangerouslySetInnerHTML={{__html: article.content}}/>
                            </div>
                        </div>
                    </div>
                    {/*<SettingHelper/>*/}
                    <SelectionTip/>
                    <BasicSetting/>
                </div>
            </ThemeWrap>
        </div>
    </ReaderProvider>
}

const Reader = () => {
    const [showReader, setShowReader] = useState(false);

    useEffect(() => {
        document.body.addEventListener('keyup', keyUp);
        chrome.runtime.onMessage.addListener(messageListen)

        return () => {
            chrome.runtime.onMessage.removeListener(messageListen)
            document.body.removeEventListener('keyup', keyUp);
        }
    }, []);

    const messageListen = async function () {

        setShowReader(prevState => {
            return !prevState
        });
    }

    const keyUp = function (e) {
        if (e.key == "Escape") {
            setShowReader(false)
        }
    }

    if (!showReader) return null

    return <Main/>
}

export default Reader
