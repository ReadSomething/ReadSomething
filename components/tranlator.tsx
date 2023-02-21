import { renderToString } from 'react-dom/server'
import { sendToBackground } from "@plasmohq/messaging";

function PlaceHolder () {
    return <div className={'translate-placeholder animate-pulse w-full p-[4px] py-[10px]'}>
        <span className={'text-[12px] leading-[12px]'}>Translating..</span>
    </div>
}

const TRANSLATED_TAG = 'rs-translated'

// function Translator({anchor}: TranslatorProps) {
//     const [translatedDom, setTranslatedDom] = useState('');
//
//     useEffect(() => {
//         void translate()
//     }, []);
//
//     async function translate() {
//         const message = await sendToBackground({
//             name: "translate",
//             body: anchor.outerHTML
//         })
//         const resp = JSON.parse(message.message)
//         setTranslatedDom(resp["data"])
//         // console.log(   ReactHtmlParser(resp["data"]))
//     }
//
//
//     return <>
//         {
//             translatedDom
//                 ? ReactHtmlParser(translatedDom)
//                 : <PlaceHolder/>
//         }
//     </>
// }

export const TRANSLATED_RESULT = 'rs-translated-result'

export const translateAnchor = async function (anchor: Element) {
    if (anchor.getAttribute(TRANSLATED_TAG)) {
        return
    }

    // create translate result container
    const container = document.createElement(anchor.nodeName.toLowerCase())

    // tag result as translated
    container.setAttribute(TRANSLATED_TAG, '1')
    container.setAttribute(TRANSLATED_RESULT, '1')

    // set translating placeholder
    container.innerHTML = renderToString(<PlaceHolder/>)

    // tag origin source as translated
    anchor.setAttribute(TRANSLATED_TAG, '1')
    anchor.after(container)

    try {
        // try translate
        const message = await sendToBackground({
            name: "translate",
            body: anchor.outerHTML
        })
        const resp = JSON.parse(message.message)

        // create a template container to get translated result, as the result is a string
        const tempContainer = document.createElement('div')
        tempContainer.innerHTML = resp["data"]

        // set result
        container.innerHTML = tempContainer.firstElementChild.innerHTML
    } catch (e) {
        // ignore
        console.log(e)
    }
}
