import {Readability} from "@mozilla/readability";
import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import styleText from "data-text:./content.scss"
import type {PlasmoGetStyle} from "plasmo"
import readingTime from 'reading-time/lib/reading-time'
import hljs from 'highlight.js';
import type {GptRes} from "~bean/GptRes";
import HelperIcon from "data-base64:~assets/talk.svg"
import CloseIcon from "data-base64:~assets/close.svg"
import {Transition} from "@headlessui/react";

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

interface TypeHelperContextValue {
    helperStatus: boolean
    setHelperStatus: (value: boolean) => void
}

const HelperContext = createContext({} as TypeHelperContextValue)

function Author({link, author}: { link: string, author: string }) {
    if (!author) return null

    let authorNode = <span>{author}</span>

    if (isValidUrl(link)) authorNode =
        <a href={link} style={{color: 'inherit', textDecoration: 'none'}} target={'_blank'}>{author}</a>

    return <div className="credits reader-credits">{authorNode}</div>
}

function HelpIcon() {
    const {helperStatus, setHelperStatus} = useContext(HelperContext);

    return <div className='w-[40px] h-[40px]' onClick={() => setHelperStatus(!helperStatus)}>
        <div className={`
            w-[40px] 
            h-[80px] 
            absolute 
            ${helperStatus ? 'grayscale-0' : 'grayscale'} 
            hover:grayscale-0
        `}>
            <img src={helperStatus ? CloseIcon : HelperIcon} className='icon w-[40px] h-[40px] cursor-pointer ' alt=""/>
        </div>
    </div>
}

function MessageBox() {
    return <div className={'bg-white rounded-r-[20px] text-black w-[60%] p-[10px] border-box'}> I will fade in and out I
        will fade in and out I will fade in and out</div>
}

function ChatBox() {
    const {helperStatus} = useContext(HelperContext);

    return <div className={'absolute right-0 bottom-[60px] rounded-[10px] overflow-hidden'}>
        <Transition
            show={helperStatus}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 w-[0] h-[0]"
            enterTo={`opacity-100 w-[300px] h-[300px]`}
            leave="transition-all ease-in-out duration-300"
            leaveFrom="opacity-0 w-[300px] h-[300px]"
            leaveTo="opacity-0 w-[0] h-[0]"
        >
            <div>
                <div className='bg-amber-500 w-[300px] h-[300px] rounded-[10px]'>
                    <MessageBox/>
                    <input type="text"/>
                </div>
            </div>
        </Transition>
    </div>
}

function SelectionTip() {
    const plasmoRoot = document.querySelectorAll('plasmo-csui')[0].shadowRoot
    const plasmoContainer = plasmoRoot.querySelector('#plasmo-shadow-container')

    const onContainerClick = function (e) {
        const selection = window.getSelection()


        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(false);

        // Create the marker element containing a single invisible character using DOM methods and insert it
        const markerEl = document.createElement("span");
        markerEl.id = 'hello';
        plasmoContainer.appendChild(document.createTextNode('good day'));
        range.insertNode(markerEl);


        console.log('hello')
    }

    useEffect(() => {
        plasmoContainer.addEventListener('mouseup', onContainerClick)

        return () => {
            plasmoContainer.removeEventListener('mouseup', onContainerClick)
        }
    }, []);

    return <div></div>
}

function HelperProvider({children}: { children: ReactNode }) {
    const [helperStatus, setHelperStatus] = useState(false);

    return <HelperContext.Provider value={{
        helperStatus,
        setHelperStatus
    }}>
        {children}
    </HelperContext.Provider>
}


function SettingHelper() {
    return <HelperProvider>
        <div className='helper fixed bottom-[30px] right-[30px]'>
            <ChatBox/>
            <HelpIcon/>
        </div>
    </HelperProvider>
}

const Reader = () => {
    const [showReader, setShowReader] = useState(false);

    const messageListen = async function () {
        console.log('start gpt')

        // const {message} = await sendToBackground({
        //     name: "gpt",
        // })
        //
        // if (message) {
        //     const data = parseGptData(message)
        //
        //     if(data) {
        //         console.log('----------------', data)
        //     }
        // }

        setShowReader(prevState => {
            if (!prevState) {
                setTimeout(() => {
                    // hljs.initHighlightingOnLoad()
                    // console.log()
                    // console.log(document.querySelectorAll('pre'))
                    // console.log('-------highlightAll--------')

                    const pres = document.querySelectorAll('plasmo-csui')[0].shadowRoot.querySelectorAll('pre')

                    pres.forEach(item => {
                        hljs.highlightElement(item)
                    })


                }, 2000)
            }

            return !prevState
        });
    }

    const keyUp = function (e) {
        if (e.key == "Escape") {
            setShowReader(false)
        }
    }

    useEffect(() => {
        chrome.runtime.onMessage.addListener(messageListen)
        document.body.addEventListener('keyup', keyUp);
        // hljs.initHighlightingOnLoad()

        // setTimeout(() => {
        //     hljs.initHighlightingOnLoad()
        // }, 3000)
        // console.log('------------highlight')

        return () => {
            chrome.runtime.onMessage.removeListener(messageListen)
            document.body.removeEventListener('keyup', keyUp);
        }
    }, []);

    if (!showReader) return null

    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone as Document, {
        keepClasses: true
    }).parse();
    const articleUrl = window.location.href;
    const author = article.byline ?? ""
    const authorLink = getMetaContentByProperty('article:author')
    const domain = window.location.hostname
    const timeToReadStr = readingTime(article.textContent).text

    console.log(article)

    // @ts-ignore
    return <div style={{"--font-size": "20px", "--content-width": "50em"}}
                className={'ReadSomething sans-serif loaded'}>
        <div className={'fixed h-full w-full overflow-scroll left-0 top-0'} style={{
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
            {/*<SelectionTip/>*/}
        </div>
    </div>
}

export default Reader
