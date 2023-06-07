import { ChatAssistantMessage, ChatUserMessage } from "~components/chat_messgae";
import IconChatSend from "react:~/assets/send.svg";
import IconChatDrag from "react:~/assets/drag.svg";
import React, {  useContext, useEffect, useRef, useState } from "react";
import { ChatMessageContext } from "~provider/chat";
import type { ChatMessage } from "~provider/chat";
import Loading from "~components/loading";
import { debounce } from "lodash";
import { getLatestState } from "~utils/state";
import { CountTokens } from "~utils/token";

const ChatBox = () => {
    const userInput = useRef<HTMLInputElement>(null);
    let { setMessages, setChatScrollRef, isLoading } = useContext(ChatMessageContext);
    const [components, setComponents] = useState([]);
    const [, setVisitedEntries] = useState([]);
    const [, setCache] = useState([]);

    const doSummarize =  debounce(async () => {
        const _cache = await getLatestState(setCache);

        let content = "";

        let i = 0;

        for (; i < _cache.length; i++) {
            const entry = _cache[i];
            content += entry.target.textContent;

            // Limit to 1024 token per message
            if (CountTokens(content) > 1024) {
                break;
            }
        }

        setCache(prevState => prevState.slice(Math.min(i, _cache.length)));

        if (content === "") {
            return;
        }

        //@ts-ignore
        setMessages(preState => [...preState, {
            role: "user",
            content: "这是一段文章内容：\n\n" + content
        } as ChatMessage]);
        setComponents(prevState => [...prevState, <ChatAssistantMessage />]);
    }, 1000);

    useEffect(() => {
        const callback = async (entries, observer) => {
            const visited = await getLatestState(setVisitedEntries);
            const intersectingEntries = entries
                .filter(entry => entry.isIntersecting && !visited.includes(entry.target))
                .filter(entry => !entry.target.classList.contains("rs-translated-result"));  // Filter out translated content

            if (intersectingEntries.length === 0) return;

            intersectingEntries.map(entry => setVisitedEntries(prevState => [...prevState, entry.target.textContent]));

            setCache(prevState => {
                return [...prevState, ...intersectingEntries]
            });

            if (!isLoading) doSummarize();
        };

        const ob = new IntersectionObserver(callback);

        const paragraphs = Array.from(document.querySelectorAll("plasmo-csui")[0].shadowRoot
            .querySelector("#readability-page-1")
            .querySelectorAll("p:not(ul p, ol p), ul:not(ul ul, ol ul), ol:not(ol ol, ul ol)"));

        paragraphs.map(e => ob.observe(e));

        return () => {
            paragraphs.map(e => ob.unobserve(e));
            ob.disconnect();
        };
    }, []);

    const handleKeyPress = async function (event) {
        if (event.key === "Enter") {
            await handleChatSendButtonClick();
        }
    };

    const handleChatSendButtonClick = async function () {
        const copy = userInput.current.value.slice();

        if (isLoading || copy === "") {
            return;
        }

        const prompt = "Please answer my question with the context: \n\n" + copy;
        // @ts-ignore
        setMessages(preState => [...preState, { role: "user", content: prompt } as ChatMessage]);

        setComponents(prevState => {
            return [
                ...prevState,
                <ChatUserMessage message={copy} />,
                <ChatAssistantMessage />
            ];
        });

        userInput.current.value = "";
    };

    return (<div id={"rs-openai-chat"}
        className={"rs-openai-chat flex flex-col items-center h-full justify-center text-gray-800 bg-purple-50 shadow pb-4 rounded"}
        style={{ fontSize: "0.9rem", transition: "all 0.2s ease-in-out" }}
    >
        <div className={"rs-chat-draggable self-center py-2"}><IconChatDrag style={{ rotate: "90deg" }} /></div>
        <div ref={ref => setChatScrollRef(ref)}
            className="flex flex-col flex-grow w-full h-full max-w-xl rounded-lg overflow-y-auto scrollbar-hide px-2">
            <div id={"rs-openai-answer"} className="flex flex-col flex-grow">
                <div className="flex w-full">
                    <div className="flex w-[80%]">
                        <div className="bg-grey-300 px-2">
                            <p>嘿！欢迎来到这里，我是你的阅读助手～本文的主要内容如下：</p>
                        </div>
                    </div>
                </div>
                {
                    components.map((component, index) => {
                        return <div key={index}>{component}</div>;
                    })
                }
            </div>

            <div className="bg-grey-300 sticky w-full bottom-0 left-0 pt-2">
                <div className="flex items-center justify-between z-10">
                    <input ref={userInput}
                        className="flex items-center h-10 w-full rounded text-sm z-20 focus:outline-none px-2"
                        type="text" autoFocus={true} onKeyDown={handleKeyPress}
                        style={{ transition: "all 0.2s ease-in-out", caretColor: "#a78bfa" }}
                    />

                    <button onClick={handleChatSendButtonClick} className={"outline-none h-10 px-[10px] bg-white"}>
                        {isLoading ? <Loading /> : <IconChatSend />}
                    </button>

                </div>
            </div>
        </div>
    </div>);
};

export default React.memo(ChatBox);
