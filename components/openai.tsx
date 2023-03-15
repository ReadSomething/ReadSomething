import React, { useEffect, useState } from "react";
import IconOpenAI from "react:~/assets/openai.svg";
import Tooltip from "./tooltip";
import { sendToBackground } from "@plasmohq/messaging";
import { getLatestState } from "~utils/state";

function OpenAI () {
    const [message, setMessage] = useState("");
    const [buttonState, setButtonState] = useState(false);

    useEffect(() => {
        const messageListen = async function (message) {
            console.log("onmessage: " + message);
            setMessage(prevState => {
                return prevState + message.message;
            });
        };

        chrome.runtime.onMessage.addListener(messageListen);

        return () => {
            chrome.runtime.onMessage.removeListener(messageListen);
        };
    });

    const handleOpenaiButtonClick = async function () {
        setButtonState(!buttonState);

        const openai = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector<HTMLElement>("#rs-openai-summary");

        if (await getLatestState(setButtonState)) {
            openai.style.display = "block";

            const plasmoRoot = document.querySelectorAll("plasmo-csui")[0].shadowRoot;
            const plasmoContainer = plasmoRoot.querySelector("#plasmo-shadow-container");

            setMessage("Loading...");
            console.log("loading openai");

            await sendToBackground({
                name: "openai_summarize",
                body: plasmoContainer.textContent.slice(0, 1000)
            });

        } else {
            openai.style.display = "none";
        }
    };

    return (
        <div onClick={handleOpenaiButtonClick}
            className={"setting select-none"}>
            <Tooltip message={"OpenAI"}>
                <button className={"outline-none"}>
                    <IconOpenAI />
                </button>
            </Tooltip>

            <div id={"rs-openai-summary"}
                className={"fixed right-[5%] top-[10%] h-[80%] w-[20%] p-[16px] border-2 overflow-y-auto"}
                hidden={true}>
                <div dangerouslySetInnerHTML={{ __html: message }}></div>
            </div>
        </div>
    );

}

export default React.memo(OpenAI);
