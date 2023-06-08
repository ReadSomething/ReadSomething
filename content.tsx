import { Readability } from "@mozilla/readability";
import type { ReactNode } from "react"

import React, { useContext, useEffect, useRef, useState } from "react";
import styleText from "data-text:./content.scss";
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";
import readingTime from "reading-time/lib/reading-time";
import SettingProvider, { SettingContext } from "~provider/setting";
import { Article, ReaderContext, ReaderProvider } from "~provider/reader";
import { translateAnchor } from "~components/tranlator";
import Toolbar from "~components/toolbar";
import ChatArticle from "~components/chat_article";
import { ScrollProvider } from "~provider/scroll";
import Scroll from "~components/scroll";
import { ChatMessageProvider } from "~provider/chat";
import Prism from "prismjs";

export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style");
    style.textContent = styleText;

    return style;
};

export const config: PlasmoCSConfig = {
    css: ["fontFamily.css", "fontClassNames.scss"]
};

const getMetaContentByProperty = (metaProperty: string) => {
    const metas = document.getElementsByTagName("meta");

    for (let i = 0; i < metas.length; i++) {
        if (metas[i].getAttribute("property") === metaProperty) {
            return metas[i].getAttribute("content");
        }
    }

    return "";
};

const isValidUrl = urlString => {
    try {
        return Boolean(new URL(urlString));
    } catch (e) {
        return false;
    }
};

const Author = ({ link, author }: { link: string, author: string }) => {
    if (!author) return null;

    let authorNode = <span>{author},</span>;

    if (isValidUrl(link)) authorNode =
        <a href={link} style={{ color: "inherit", textDecoration: "none" }} target={"_blank"}
            rel="noreferrer">{author},</a>;

    return <div className="credits reader-credits">{authorNode}</div>;
}

function ThemeWrap ({ children }: { children: ReactNode }) {
    const { settingObject: { themeMode } } = useContext(SettingContext);

    let themeClass = "";

    switch (themeMode) {
    case "light":
        themeClass = "light";
        break;
    case "dark":
        themeClass = "dark";
        break;
    }

    return <div
        className={`ReadSomething heti heti--classic ${themeClass}`}>
        {children}
    </div>;
}

const MainContent = ({ children }: { children: ReactNode }) => {
    const { settingObject: { fontSize, pageWidth, lineSpacing, fontFamily } } = useContext(SettingContext);

    return <div style={{
        // @ts-ignore
        "--font-size": `${fontSize}px`,
        "--content-width": `${pageWidth}px`,
        "--line-height": lineSpacing,
        "--font-family": fontFamily
    }}>
        {children}
    </div>;
}

const ContainerWrap = ({ children }: { children: ReactNode }) => {
    const { settingObject: { fontFamily } } = useContext(SettingContext);

    return <div className={`container ${fontFamily !== "Default" ? "custom-font" : ""}`}>{children}</div>;
}

const Title = ({ title }: { title: string }) => {
    const { translateOn } = useContext(ReaderContext);
    const ref = useRef<HTMLHeadingElement>(null);
    const { settingObject: { translateService, openaiKey } } = useContext(SettingContext);

    useEffect(() => {
        if (translateOn && ref && ref.current) {
            void translateAnchor(ref.current, translateService, openaiKey);
        }
    }, [translateOn, ref, ref.current]);

    return <h1 ref={ref} className="reader-title" style={{ fontFamily: "Bookerly" }}>{title}</h1>;
}

const Main = () => {
    useEffect(() => {
        const defaultOverflowStyle = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = defaultOverflowStyle;
        };
    }, []);

    useEffect(() => {
        const codes = document.querySelectorAll("plasmo-csui")[0].shadowRoot.querySelectorAll("pre code");

        if (codes) {
            codes.forEach(block => {
                try {
                    Prism.highlightElement(block as HTMLElement);
                } catch (e) {
                    console.error(e);
                }
            })
        }
    }, []);

    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone as Document,  {}).parse();
    const articleUrl = window.location.href;
    const author = article.byline ?? "";
    const authorLink = getMetaContentByProperty("article:author");
    const domain = window.location.hostname;
    const timeToReadStr = readingTime(article.textContent).text;

    return (
        <ReaderProvider article={new Article(article.title)}>
            <SettingProvider>
                <MainContent>
                    <ThemeWrap>
                        <ScrollProvider>
                            <Scroll>
                                <ContainerWrap>
                                    <div className="header reader-header reader-show-element">
                                        <a className="domain reader-domain hidden"
                                            href={articleUrl}>{domain}</a>
                                        <div className="domain-border"></div>
                                        <Title title={article.title} />

                                        <div className={"flex gap-[10px]"}>
                                            <Author link={authorLink} author={author} />
                                            <div className="meta-data">
                                                <div className="reader-estimated-time"
                                                    data-l10n-id="about-reader-estimated-read-time"
                                                    data-l10n-args="{&quot;range&quot;:&quot;3–4&quot;,&quot;rangePlural&quot;:&quot;other&quot;}"
                                                    dir="ltr">{timeToReadStr}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <hr />
                                    <div className={"content"}>
                                        <div className={`mozReaderContent readerShowElement`}>
                                            <div className="page"
                                                dangerouslySetInnerHTML={{ __html: article.content }} />
                                        </div>
                                    </div>
                                    <ChatMessageProvider>
                                        <ChatArticle />
                                    </ChatMessageProvider>

                                </ContainerWrap>
                                <Toolbar />
                            </Scroll>
                        </ScrollProvider>
                    </ThemeWrap>
                </MainContent>
            </SettingProvider>
        </ReaderProvider>
    )
    ;
}

const Reader = () => {
    const [showReader, setShowReader] = useState(false);

    useEffect(() => {
        document.body.addEventListener("keyup", keyUp);
        chrome.runtime.onMessage.addListener(messageListen);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListen);
            document.body.removeEventListener("keyup", keyUp);
        };
    }, []);

    const messageListen = async function () {

        setShowReader(prevState => {
            return !prevState;
        });
    };

    const keyUp = function (e) {
        if (e.key === "Escape") {
            setShowReader(false);
        }
    };

    if (!showReader) return null;

    return <Main />;
};

export default React.memo(Reader);
