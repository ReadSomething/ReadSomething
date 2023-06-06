import React, { useState } from "react";

interface ChatMessages {
    messages: ChatMessage[];
    setMessages: (value: ChatMessage[]) => void;
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
    chatScrollRef: HTMLElement;
    setChatScrollRef: (value: HTMLElement) => void;

}

interface ChatMessage {
    role: string;
    content: string;
}

const ChatMessageContext = React.createContext({} as ChatMessages);

const ChatMessageProvider = ({ children }) => {
    const [messages, setMessages] = useState([{
        role: "system",
        content: `我想让你充当文章阅读助手，你的名字是读点东西，我会提供文章内容给你，首先你需要生成一段中文 HTML 格式的摘要，
过程中我会问你许多关于文章本身的问题，你要基于文章的内容作答，你的目标是帮我快速理解文章内容。不管我发送什么语言，你都要回答中文。`
    } as ChatMessage]);
    const [isLoading, setIsLoading] = useState(false);
    const [chatScrollRef, setChatScrollRef] = useState(null);

    return (
        <ChatMessageContext.Provider
            value={{ messages, setMessages, isLoading, setIsLoading, chatScrollRef, setChatScrollRef }}>
            {children}
        </ChatMessageContext.Provider>
    );
};

export type { ChatMessages, ChatMessage };
export { ChatMessageContext, ChatMessageProvider };
