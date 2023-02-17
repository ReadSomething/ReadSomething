import ReactDOM from "react-dom/client";
import {useEffect, useState} from "react";
import {sendToBackground} from "@plasmohq/messaging";

function PlaceHolder() {
    return <div className={'translate-placeholder animate-pulse w-full p-[4px] py-[10px]'}>
        <span className={'text-[12px] leading-[12px]'}>Translating..</span>
    </div>
}

interface TranslatorProps {
    anchor: HTMLParagraphElement,
}

function Translator({anchor}: TranslatorProps) {
    const [translatedDom, setTranslatedDom] = useState('');

    useEffect(() => {
        void translate()
    }, []);

    async function translate() {
        const message = await sendToBackground({
            name: "translate",
            body: anchor.outerHTML
        })
        const resp = JSON.parse(message.message)
        setTranslatedDom(resp["data"])
    }

    return <>
        {
            translatedDom
                ? <p dangerouslySetInnerHTML={{__html: translatedDom}}></p>
                : <PlaceHolder/>
        }
    </>
}

export const translateAnchor = function (anchor) {
    const container = document.createElement('p')
    anchor.after(container)
    ReactDOM.createRoot(container).render(<Translator anchor={anchor}/>)
}
