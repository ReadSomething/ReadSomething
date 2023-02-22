import React, { useContext, useEffect, useState } from "react";
import IconTranslate from "react:~/assets/translate.svg";
import { translateAnchor, TRANSLATED_RESULT } from "~components/tranlator";
import { getLatestState } from "~utils/state";
import { ReaderContext } from "~provider/reader";
import Tooltip from "./tooltip";
import { SettingContext } from "~provider/setting";

function Translate () {
    const [, setParagraphs] = useState<Element[]>();
    const { translateOn, setTranslateOn } = useContext(ReaderContext);
    const { settingObject } = useContext(SettingContext);

    // fixme: singleton
    const observer = new IntersectionObserver(
        function (entries) {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    void translateAnchor(entry.target, settingObject.translateService);
                } else {
                    console.log(entry.isIntersecting);
                }
            }
        }
    );

    const hideTranslateResult = function () {
        const translateResult = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelectorAll<HTMLElement>(`[${TRANSLATED_RESULT}]`);

        for (let i = 0; i < translateResult.length; i++) {
            translateResult[i].style.display = "none";
        }
    };

    const showTranslateResult = function () {
        const translateResult = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelectorAll<HTMLElement>(`[${TRANSLATED_RESULT}]`);

        for (let i = 0; i < translateResult.length; i++) {
            translateResult[i].style.display = "block";
        }
    };

    const handleTranslateButtonClick = async function () {
        setTranslateOn(!translateOn);

        const paragraphs = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readability-page-1")
            .querySelectorAll("p:not(ul p, ol p), ul:not(ul ul, ol ul), ol:not(ol ol, ul ol)");

        if (await getLatestState(setTranslateOn)) {
            showTranslateResult();

            setParagraphs(Array.from(paragraphs));
            Array.from(paragraphs).map(e => observer.observe(e));
        } else {
            hideTranslateResult();
            Array.from(paragraphs).map(e => observer.unobserve(e));
        }
    };

    useEffect(function () {
        return function () {
            observer.disconnect();

        };
    });

    return (
        <div onClick={handleTranslateButtonClick}
            className={"setting fixed select-none right-[130px] top-[30px] select-none"}
        >
            <Tooltip message={"Translate"}>
                <button className={"outline-none"}>
                    <IconTranslate />
                </button>
            </Tooltip>
        </div>
    );
}

export default React.memo(Translate);
