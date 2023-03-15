import React, { useEffect, useState } from "react";
import IconOpenAI from "react:~/assets/openai.svg";
import Tooltip from "./tooltip";
// import { sendToBackground } from "@plasmohq/messaging";
import { getLatestState } from "~utils/state";
import { ChatCompletionRequestMessageRoleEnum } from "openai";

function OpenAI () {
    const [message, setMessage] = useState("");
    const [buttonState, setButtonState] = useState(false);
    const messagePlaceHolder = "Loading..."

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

            setMessage(messagePlaceHolder);
            console.log("loading openai");

            // await sendToBackground({
            //     name: "openai_summarize",
            //     body: plasmoContainer.textContent.slice(0, 1000)
            // });

            getSummery(plasmoContainer.textContent.slice(0, 1000))

        } else {
            openai.style.display = "none";
        }
    };

    const getSummery = function (str: string) {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "Bearer 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");

        const raw = JSON.stringify({
            "model": "gpt-3.5-turbo",
            "stream": true,
            "messages": [
                {
                    role: ChatCompletionRequestMessageRoleEnum.System,
                    content: `Please generate a Chinese summary of the following text and generate three questions and short answer for read this article, question and answer start withs Q: and A:, return html with the following template
<div class="summary-qa">
  <p>Hey! Welcome here, This is your Reading Assistant~ The main content of this article is as follows:</p>
  <p>Summary Contents</p>
  <p>And there some important information and resources maybe helpful for your reading:</p>
  <div>
    <p>Question</p>
    <p>Answer</p>
  </div>
</div>:`
                },
                {
                    role: ChatCompletionRequestMessageRoleEnum.User,
                    content: str
                }
            ]
        });

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        // @ts-ignore
        fetch("https://api.openai.com/v1/chat/completions", requestOptions)
            .then(response => {
                const stream = response.body;
                const reader = stream.getReader();

                // read from the stream
                function readStream () {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            console.log("Stream ended");

                            return;
                        }

                        console.log(value);
                        const enc = new TextDecoder("utf-8");
                        const str = enc.decode(value.buffer);

                        let message = "";
                        str.split("\n").forEach(line => {
                            console.log(line)
                            let text = line.replace("data: ", "").replace("\n", "");
                            console.log(text);

                            if (text !== "" && text !== "[DONE]") {
                                const payload = JSON.parse(text);
                                message += (payload.choices[0].delta.content || '');
                            }
                        });

                        console.log('message', message)
                        setMessage(prevState => {
                            if (prevState === messagePlaceHolder) {
                                return message || ''
                            }

                            return prevState + (message || '');
                        })

                        // read the next chunk
                        readStream();
                    });
                }

                readStream();
                // console.log(req.sender.tab.id)
                //
                // chrome.runtime.sendMessage({
                //     tabId: req.sender.tab.id,
                //     message: {
                //         message: "Please wait for a moment, the translation is in progress."
                //     }
                // })

            })
            .catch(error => console.log("error", error));

    }

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
