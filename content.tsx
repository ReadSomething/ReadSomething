import { Readability } from "@mozilla/readability";
import { ReactNode, useContext, useEffect, useState } from "react";
import styleText from "data-text:./content.scss"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import readingTime from 'reading-time/lib/reading-time'
import SettingProvider, { SettingContext } from "~provider/setting";
import { Article, ReaderProvider } from "~provider/reader";
import { BasicSetting } from "~components/setting";
import { DownloadMarkdown } from "~components/download";
import Translate from "~components/translate";

// a plasmo hook
export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style")
    style.textContent = styleText

    return style
}

export const config: PlasmoCSConfig = {
    css: ["fontFamily.css", "fontClassNames.scss"]
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

export enum EnumTheme {
    Standard = 'standard',
    Heti = 'Heti',
    HetiA = 'HetiA'
}

function Author ({ link, author }: { link: string, author: string }) {
    if (!author) return null

    let authorNode = <span>{author}</span>

    if (isValidUrl(link)) authorNode =
        <a href={link} style={{ color: 'inherit', textDecoration: 'none' }} target={'_blank'} rel="noreferrer">{author}</a>

    return <div className="credits reader-credits">{authorNode}</div>
}

function ThemeWrap ({ children }: { children: ReactNode }) {
    const { settingObject } = useContext(SettingContext);

    console.log('-------------', settingObject)

    let themeClass = ''

    switch (settingObject.theme) {
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

function MainContent ({ children }: {children: ReactNode}) {
    const { settingObject: { fontSize, pageWidth, lineSpacing, fontFamily } } = useContext(SettingContext);

    // @ts-ignore
    return <div style={{ "--font-size": `${fontSize}px`, "--content-width": `${pageWidth}px`, "--line-height": lineSpacing, "--font-family": fontFamily }}>
        {children}
    </div>
}

function ContainerWrap ({ children }: {children: ReactNode}) {
    const { settingObject: { fontFamily } } = useContext(SettingContext);

    return  <div className={`container ${fontFamily !== 'Default' ? 'custom-font' : ''}`}>{children}</div>
}

function Main () {
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

    return (
        <ReaderProvider article={new Article(article.title)}>
            <SettingProvider>
                <MainContent>
                    <div
                        className={'ReadSomething'}>
                        <ThemeWrap>
                            <div id={'readsomething-scroll'} className={'fixed h-full  w-full overflow-scroll left-0 top-0'} style={{
                                backgroundColor: "var(--main-background)"
                            }}>
                                <ContainerWrap>
                                    <div className="header reader-header reader-show-element">
                                        <a className="domain reader-domain"
                                            href={articleUrl}>{domain}</a>
                                        <div className="domain-border"></div>
                                        <h1 className="reader-title" style={{ fontFamily: 'Bookerly' }}>{article.title}</h1>
                                        <Author link={authorLink} author={author}/>
                                        <div className="meta-data">
                                            <div className="reader-estimated-time"
                                                data-l10n-id="about-reader-estimated-read-time"
                                                data-l10n-args="{&quot;range&quot;:&quot;3–4&quot;,&quot;rangePlural&quot;:&quot;other&quot;}"
                                                dir="ltr">{timeToReadStr}
                                            </div>
                                        </div>
                                    </div>
                                    <hr/>
                                    <div className={'content'}>
                                        <div className={`mozReaderContent readerShowElement`}>
                                            <div className='page' dangerouslySetInnerHTML={{ __html: article.content }}/>
                                        </div>
                                    </div>
                                </ContainerWrap>
                                {/*<SettingHelper/>*/}
                                <Translate />
                                <DownloadMarkdown/>
                                <BasicSetting/>
                            </div>
                        </ThemeWrap>
                    </div>
                </MainContent>
            </SettingProvider>
        </ReaderProvider>
    )
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
        if (e.key === "Escape") {
            setShowReader(false)
        }
    }

    if (!showReader) return null

    return <Main/>
}

export default Reader
