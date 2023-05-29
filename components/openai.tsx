import React, { useEffect, useState } from "react";
import IconOpenAI from "react:~/assets/openai.svg";
import Tooltip from "./tooltip";

// import { sendToBackground } from "@plasmohq/messaging";

function OpenAI () {
    const [buttonState, setButtonState] = useState(true);

    useEffect(() => {
        handleOpenaiButtonClick();
    }, []);

    const handleOpenaiButtonClick = function () {
        setButtonState(!buttonState);
        const openai = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector<HTMLElement>("#rs-chat-container");

        openai.style.display = !buttonState ? "block" : "none";

    };

    return (
        <div className={"setting select-none"}>
            <Tooltip message={"OpenAI"}>
                <button className={"outline-none"} onClick={handleOpenaiButtonClick}>
                    <IconOpenAI />
                </button>
            </Tooltip>
        </div>
    );

}

export default React.memo(OpenAI);
