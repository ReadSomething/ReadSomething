import React, { useContext, useEffect } from "react";
import IconTranslate from "react:~/assets/translate.svg";
import { translateAnchor, TRANSLATED_RESULT } from "~components/tranlator";
import { getLatestState } from "~utils/state";
import { ReaderContext } from "~provider/reader";
import Tooltip from "./tooltip";
import { SettingContext } from "~provider/setting";

const Translate = () => {
    const { translateOn, setTranslateOn } = useContext(ReaderContext);
    const { settingObject } = useContext(SettingContext);

    useEffect(() => {
        const ob = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        void translateAnchor(entry.target, settingObject.translateService, settingObject.openaiKey);
                    } else {
                        // do nothing
                    }
                }
            })

        const paragraphs = Array.from(document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector("#readability-page-1")
            .querySelectorAll("p:not(ul p, ol p), ul:not(ul ul, ol ul), ol:not(ol ol, ul ol)"));

        translateOn
            ? paragraphs.map(e => ob.observe(e))
            : (paragraphs.map(e => ob.unobserve(e)))

        return () => ob.disconnect()
    }, [settingObject, translateOn]);

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

        await getLatestState(setTranslateOn) ? showTranslateResult() :  hideTranslateResult()
    };

    return (
        <div onClick={handleTranslateButtonClick}
            className={"setting select-none"}
        >
            <Tooltip message={"Translate"}>
                <button className={"outline-none"}>
                    <IconTranslate/>
                </button>
            </Tooltip>
        </div>
    );
}

export default React.memo(Translate);
