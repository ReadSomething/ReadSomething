import React, { useState } from "react";

interface ChatMessages {
    messages: ChatMessage[];
    setMessages: (value: ChatMessage[]) => void;
}

interface ChatMessage {
    role: string;
    content: string;
}

const ChatMessageContext = React.createContext({} as ChatMessages);

const ChatMessageProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);

    return (
        <ChatMessageContext.Provider value={{ messages, setMessages }}>
            {children}
        </ChatMessageContext.Provider>
    );
};

export { ChatMessageContext, ChatMessages, ChatMessage, ChatMessageProvider };
