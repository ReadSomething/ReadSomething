import {Readability} from "@mozilla/readability";
import $ from "jquery";
import {useEffect, useState} from "react";
import styleText from "data-text:./content.scss"
import type {PlasmoGetStyle} from "plasmo"
import readingTime from 'reading-time/lib/reading-time'

// plasmo 会调用这个方法
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

function Author  ({link, author}: {link: string, author: string}) {
    let authorNode = <span>{author}</span>

    if (isValidUrl(link)) authorNode =
        <a href={link} style={{color: 'inherit', textDecoration: 'none'}} target={'_blank'}>{author}</a>

    return <div className="credits reader-credits">{authorNode}</div>
}

const Reader = () => {
    const [showReader, setShowReader] = useState(false);

    const messageListen = function () {
        setShowReader(prevState => {
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

        return function () {
            chrome.runtime.onMessage.removeListener(messageListen)
            document.body.removeEventListener('keyup', keyUp);
        }
    }, []);

    if (!showReader) return null

    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone as Document).parse();
    const article_url = window.location.href;
    const author = article.byline ?? "Unknown author"
    const domain = window.location.hostname
    const timeToReadStr = readingTime(article.textContent).text
    const authorLink = getMetaContentByProperty('article:author')

    console.log(article)

    // @ts-ignore
    return <div style={{"--font-size": "20px", "--content-width": "30em"}}
                className={'ReadSomething dark sans-serif loaded'}>
        <div style={{
            position: 'fixed',
            height: '100%',
            width: "100%",
            overflow: 'scroll',
            left: 0,
            top: 0,
            backgroundColor: "var(--main-background)"
        }}>
            <div className={'container'}>
                <div className="header reader-header reader-show-element">
                    <a className="domain reader-domain"
                       href={article_url}>{domain}</a>
                    <div className="domain-border"></div>
                    <h1 className="reader-title">{article.title}</h1>
                    <Author link={authorLink} author={author}></Author>
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
        </div>
    </div>
}

export default Reader
