import React, { useContext, useEffect, useState } from "react";
import IconTranslate from "react:~/assets/translate.svg";
import { translateAnchor } from "~components/tranlator";
import { getLatestState } from "~utils/state";
import { ReaderContext } from "~provider/reader";


function Translate() {
    const [paragraphs, setParagraphs] = useState<Element[]>();
    const { translateOn, setTranslateOn } = useContext(ReaderContext);


    const translate = async function() {
        setTranslateOn(true);

        const paragraphs1 = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readability-page-1")
            .querySelectorAll(`[data-selectable-paragraph]`);
        const paragraphs2 = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readability-page-1")
            .querySelectorAll("p");
        const paragraphs = Array.from(new Set([...paragraphs1, ...paragraphs2]));

        setParagraphs(paragraphs);

        // first time
        await scrollListener();

        // listen scroll event
        const scroll = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readsomething-scroll");

        scroll.addEventListener("scroll", scrollListener, false);
    };

    useEffect(function() {
        const scroll = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readsomething-scroll");

        return function() {
            scroll.removeEventListener("scroll", scrollListener, false);
        };
    });

    const scrollListener = async function() {
        const _paragraphs = await getLatestState(setParagraphs);
        for (let i = 0; i < _paragraphs.length; i++) {
            const item = _paragraphs[i];
            if (isInViewport(item)) translateAnchor(item);
        }
    };

    const isInViewport = function(elem) {
        const bounding = elem.getBoundingClientRect();
        return (
            bounding.top >= 0 &&
            bounding.left >= 0 &&
            bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    function createElementFromHTML(htmlString) {
        const div = document.createElement("div");
        div.innerHTML = htmlString.trim();

        // Change this to div.childNodes to support multiple top-level nodes.
        return div;
    }

    // @ts-ignore
    return (
        <div onClick={translate} className={"setting fixed select-none right-[130px] top-[30px] select-none"}
             title={"Translate"}>
            <div>
                <button className={"outline-none"}>
                    <IconTranslate />
                </button>
            </div>
        </div>
    );
}

export default React.memo(Translate);
