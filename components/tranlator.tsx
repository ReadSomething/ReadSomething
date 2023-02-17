import ReactDOM from "react-dom";
import {Fragment, useEffect, useState} from "react";

function PlaceHolder() {
    return <div className={'translate-placeholder animate-pulse w-full p-[4px] py-[10px]'}>
        <span className={'text-[12px] leading-[12px]'}>Translating..</span>
    </div>
}

function Translator() {
    const [translatedDom, setTranslatedDom] = useState('');

    useEffect(() => {
        // start translate
        setTimeout(() => {
            setTranslatedDom('<b>hello</b>')
        }, 3000)
    }, []);

    function translate() {

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
    const container = document.createElement('div')
    anchor.after(container)

    ReactDOM.render(<Translator/>, container)
}
