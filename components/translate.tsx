import React, { useContext, useEffect, useState } from "react";
import IconTranslate from "react:~/assets/translate.svg";
import { translateAnchor } from "~components/tranlator";
import { getLatestState } from "~utils/state";
import { ReaderContext } from "~provider/reader";


function Translate() {
    const [paragraphs, setParagraphs] = useState<Element[]>();
    const { translateOn, setTranslateOn } = useContext(ReaderContext);

    const handleTranslateButtonClick = async function() {
        setTranslateOn(!translateOn);

        if (await getLatestState(setTranslateOn)) {
            const paragraphs = document.querySelectorAll("plasmo-csui")[0]
                .shadowRoot
                .querySelector("#readability-page-1")
                .querySelectorAll("p, li, [data-selectable-paragraph]");
            setParagraphs(Array.from(paragraphs));

            // first time
            await translateCurrentPage();

            // listen scroll event
            const scroll = getScroll();
            scroll.addEventListener("scroll", scrollListener);
        } else {
            const scroll = getScroll();
            scroll.removeEventListener("scroll", scrollListener);
            console.log("Translate off. Remove scroll event listener.");
        }
    };

    useEffect(function() {
        const scroll = getScroll();

        return function() {
            scroll.removeEventListener("scroll", scrollListener);
        };
    });

    function getScroll() {
        return document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readsomething-scroll");
    }

    const translateCurrentPage = async function() {
        const _paragraphs = await getLatestState(setParagraphs);
        for (let i = 0; i < _paragraphs.length; i++) {
            const item = _paragraphs[i];
            if (isInViewport(item)) translateAnchor(item);
        }
    };

    function debounce(func, wait) {
        let timeout;
        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(func, wait);
        };
    }

    const scrollListener = debounce(async () => {
        await translateCurrentPage();
    }, 200);

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
        <div onClick={handleTranslateButtonClick}
             className={"setting fixed select-none right-[130px] top-[30px] select-none"}
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
