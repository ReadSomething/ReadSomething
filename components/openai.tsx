import React, { useState } from "react";
import IconOpenAI from "react:~/assets/openai.svg";
import Tooltip from "./tooltip";
import { sendToBackground } from "@plasmohq/messaging";

function OpenAI () {
    const [getMessage, setMessage] = useState("");
    let on = false;

    const handleOpenaiButtonClick = async function () {
        const openai = document.querySelectorAll("plasmo-csui")[0]
            .shadowRoot
            .querySelector<HTMLElement>("#rs-openai-summary");

        on = !on;

        if (on) {
            openai.style.display = "block";

            const plasmoRoot = document.querySelectorAll("plasmo-csui")[0].shadowRoot;
            const plasmoContainer = plasmoRoot.querySelector("#plasmo-shadow-container");

            const message = await sendToBackground({
                // @ts-ignore
                name: "openai_summarize",
                body: plasmoContainer.textContent.slice(0, 1000)
            });
            const innerHTML = message.message;
            setMessage(innerHTML);
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
                className={"fixed right-[10%] top-[20%] h-[800px] w-[20%] p-[16px] border-2 overflow-y-auto"}
                hidden={true}>
                <div dangerouslySetInnerHTML={{ __html: getMessage }}></div>
            </div>
        </div>
    );
}

export default OpenAI;
