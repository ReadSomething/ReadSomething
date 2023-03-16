import React, { useEffect, useState } from "react";
import { getLatestState } from "~utils/state";
import { ChatMessageContext } from "~provider/chat";

const ChatUserMessage = (props) => {
    return (
        <div className="flex mt-2 space-x-3 max-w-xs ml-auto justify-end w-[80%]">
            <div>
                <div className="bg-grey-300 p-2 rounded-l-lg rounded-br-lg">
                    <p>{props.message}</p>
                </div>
            </div>
        </div>
    );
};

const ChatAssistantMessage = (props) => {
    const [message, setMessage] = useState("");
    const { messages, setMessages } = React.useContext(ChatMessageContext);

    useEffect(() => {
        setMessage(props.placeholder || "Loading...");
        callOpenAI();
    }, []);

    const callOpenAI = function () {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", "Bearer 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");

        const raw = JSON.stringify({
            "model": "gpt-3.5-turbo-0301",
            "stream": true,
            "messages": [...messages]
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
                    reader.read().then(async ({ done, value }) => {
                        if (done) {
                            return;
                        }

                        const enc = new TextDecoder("utf-8");
                        const str = enc.decode(value.buffer);

                        let chunk = "";

                        for (const line of str.split("\n")) {
                            let text = line.replace("data: ", "").replace("\n", "");

                            if (text !== "" && text !== "[DONE]") {
                                const payload = JSON.parse(text);
                                chunk += (payload.choices[0].delta.content || "");
                            }

                            if (text === "[DONE]") {
                                let latestMessage = await getLatestState(setMessage);

                                setMessages([...messages, {
                                    role: "assistant",
                                    content: latestMessage
                                }]);

                            }
                        }

                        setMessage(prevState => {
                            if (prevState === "Loading...") {
                                prevState = "";
                            }

                            return prevState + (chunk || "");
                        });

                        // read the next chunk
                        readStream();
                    });
                }

                readStream();

            })
            .catch(error => console.log("error", error));

    };

    return (
        <div className="flex mt-2 space-x-3 max-w-xs w-[80%]">
            <div>
                <div className="bg-grey-300 p-2 rounded-r-lg rounded-bl-lg"
                    dangerouslySetInnerHTML={{ __html: message }}>
                </div>
            </div>
        </div>
    );
};

export { ChatUserMessage, ChatAssistantMessage };
