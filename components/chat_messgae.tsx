import React, { useEffect, useState } from "react";
import { getLatestState } from "~utils/state";
import { ChatMessageContext } from "~provider/chat";
import type { ChatMessage } from "~provider/chat";
import { SettingContext } from "~provider/setting";
import { CountTokens } from "~utils/token";

const ChatUserMessage = (props) => {
    const { chatScrollRef } = React.useContext(ChatMessageContext);

    useEffect(() => {
        // Auto scroll to bottom
        if (chatScrollRef !== null) {
            chatScrollRef.scrollTop = chatScrollRef?.scrollHeight;
        }
    }, []);

    return (
        <div className="flex justify-end w-full">
            <div className="flex justify-end w-[80%]">
                <div className="bg-grey-300 p-2">
                    <p>{props.message}</p>
                </div>
            </div>
        </div>
    );
};

const ChatAssistantMessage = (props) => {
    const [message, setMessage] = useState("");
    const { settingObject: { openaiKey } } = React.useContext(SettingContext);
    const { messages, setMessages, chatScrollRef, isLoading, setIsLoading } = React.useContext(ChatMessageContext);

    useEffect(() => {
        if (isLoading) return;

        setIsLoading(true);
        setMessage(props.placeholder || "···");
        callOpenAI();
    }, []);

    function handleMessages () {
        const threshold = 4096 - 1024;

        let limitMessages = [];
        let currentLength = 0;

        for (let i = messages.length - 1; i >= 1; i--) {
            const message = messages[i];
            currentLength += CountTokens(message.content);

            if (currentLength > threshold || i === 1) {
                limitMessages = [messages[0], ...messages.slice(i)];
                break;
            }
        }

        return [...limitMessages];
    }

    const callOpenAI = function () {
        // check openaiKey
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", `Bearer ${openaiKey}`);

        const raw = JSON.stringify({
            "model": "gpt-3.5-turbo-0301",
            "stream": true,
            "messages": handleMessages()
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

                if (response.status === 401 || response.status === 403) {
                    setMessage("请检查 API Key 是否正确，Settings -> OpenAI Key");
                    setIsLoading(false);

                    return
                } else if (response.status >= 500) {
                    setMessage("OpenAI 服务异常，请稍后再试");
                    setIsLoading(false);
                }

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
                                setIsLoading(false);

                                let latestMessage = await getLatestState(setMessage);

                                setMessages([...messages, {
                                    role: "assistant",
                                    content: latestMessage
                                } as ChatMessage]);

                            }
                        }

                        setMessage(prevState => {
                            if (prevState === "···") {
                                prevState = "";
                            }

                            return prevState + (chunk || "");
                        });

                        // Auto scroll to bottom
                        if (chatScrollRef !== null) {
                            chatScrollRef.scrollTop = chatScrollRef?.scrollHeight;
                        }

                        // read the next chunk
                        readStream();
                    });
                }

                readStream();
            });

    };

    return (
        <div className="flex w-full">
            <div className="w-[80%] bg-purple-50 border-amber-50">
                <div className="bg-grey-300 p-2" dangerouslySetInnerHTML={{ __html: message }}></div>
            </div>
        </div>
    );
};

export { ChatUserMessage, ChatAssistantMessage };
