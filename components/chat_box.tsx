import { ChatAssistantMessage, ChatUserMessage } from "~components/chat_messgae";
import IconChatSend from "react:~/assets/send.svg";
import React, { useContext, useEffect, useRef, useState } from "react";
import { ChatMessage, ChatMessageContext } from "~provider/chat";

const ChatBox = () => {
    const userInput = useRef<HTMLInputElement>(null);
    const { messages, setMessages } = useContext(ChatMessageContext);
    const [components, setComponents] = useState([]);

    useEffect(() => {
        const plasmoRoot = document.querySelectorAll("plasmo-csui")[0].shadowRoot;
        const plasmoContainer = plasmoRoot.querySelector("#plasmo-shadow-container");

        let startMessage = [
            {
                role: "system",
                content: `Please generate a Chinese summary of the following text, return as following html template
<p>__SUMMARY__</p>
<p>你可以通过提问来阅读文章，这里是几个建议的问题：<br>Q: __QUESTION__</p>`
            },
            {
                role: "user",
                content: plasmoContainer.textContent.slice(0, 1000)
            }
        ];
        setMessages(startMessage);

        setComponents(prevState => {
            return [
                ...prevState,
                <ChatAssistantMessage placeholder={"<p>嘿！欢迎来到这里，我是你的阅读助手～本文的主要内容如下：</p>"} />
            ];
        });
    }, []);

    const handleKeyPress = function (event) {
        if (event.key === "Enter") {
            handleChatSendButtonClick();
        }
    };

    const handleChatSendButtonClick = function () {
        if (userInput.current.value === "") {
            return;
        }

        const prompt = "Please answer my question with the context: \n\n" + userInput.current.value;
        setMessages([...messages, { role: "user", content: prompt } as ChatMessage]);

        setComponents(prevState => {
            return [
                ...prevState,
                <ChatUserMessage message={userInput.current.value} />,
                <ChatAssistantMessage />
            ];
        });

        userInput.current.value = "";
    };

    return <div id={"rs-openai-chat"}
        className={"py-[10px] overflow-y-auto flex flex-col items-center justify-center text-gray-800 bg-purple-50 shadow-xl"}>
        <div className="flex flex-col flex-grow w-full h-full max-w-xl rounded-lg">
            <div id={"rs-openai-answer"} className="flex flex-col flex-grow p-4">
                {
                    components.map((component, index) => {
                        return <div key={index}>{component}</div>;
                    })
                }
            </div>

            <div className="bg-grey-300 p-4">
                <div className="flex items-center justify-between z-10">
                    <input ref={userInput} className="flex items-center h-10 w-full rounded px-2 text-sm z-20"
                        type="text" autoFocus={true} onKeyDown={handleKeyPress}
                        placeholder="Ask any question..." />
                    <button onClick={handleChatSendButtonClick}
                        className={"outline-none h-10 px-[10px] hover:shadow-md"}>
                        <IconChatSend />
                    </button>
                </div>
            </div>
        </div>
    </div>;
};

export default ChatBox;
