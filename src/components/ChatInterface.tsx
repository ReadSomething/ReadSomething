import React, { useState, useEffect, useRef } from 'react';
import llmClient from '../utils/llmClient';
import { ModelOption, getModelLabel, DEFAULT_MODEL } from '../config/model';
import { ChatMessage } from '../types/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatInterface: React.FC = () => {
  // State for selected model
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL);

  // State for storing chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      message: "Hello! I'm your ReadLite AI assistant. How can I help you today?",
      sender: "AI Assistant",
      direction: "incoming",
      sentTime: new Date().toLocaleTimeString(),
      id: "welcome-" + Date.now()
    }
  ]);
  
  // State for tracking when the AI is processing a response
  const [isTyping, setIsTyping] = useState(false);
  
  // State for input message
  const [inputMessage, setInputMessage] = useState("");
  
  // Reference to message list container for auto-scrolling
  const messageListRef = useRef<HTMLDivElement>(null);

  // Handle model change
  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
    
    // Add system message about model change
    const modelChangeMessage: ChatMessage = {
      message: `Model switched to ${getModelLabel(model)}`,
      sender: "System",
      direction: "incoming",
      sentTime: new Date().toLocaleTimeString(),
      id: "system-" + Date.now()
    };
    
    setMessages(prevMessages => [...prevMessages, modelChangeMessage]);
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Handle sending a message
  const handleSend = async () => {
    if (!inputMessage.trim()) return;
    
    const message = inputMessage;
    setInputMessage(""); // Clear input field
    
    // Create and add user message with a unique ID
    const newUserMessage: ChatMessage = {
      message: message,
      sender: "User",
      direction: "outgoing",
      sentTime: new Date().toLocaleTimeString(),
      id: "user-" + Date.now()
    };
    
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Create an initial AI message with empty content
      const responseId = "ai-" + Date.now();
      const initialResponse: ChatMessage = {
        message: "",
        sender: "AI Assistant",
        direction: "incoming",
        sentTime: new Date().toLocaleTimeString(),
        id: responseId
      };
      
      setMessages(prevMessages => [...prevMessages, initialResponse]);
      
      // Stream response handler
      let isFirstChunk = true;
      
      // Handle each chunk of the response using streaming API
      const handleStreamChunk = (chunk: string) => {
        if (!chunk) return;
        
        if (isFirstChunk) {
          console.log("[DEBUG] ChatInterface: Received first chunk of streaming response");
          isFirstChunk = false;
        }
        
        // Update the existing message with new content
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const messageIndex = updatedMessages.findIndex(msg => msg.id === responseId);
          
          if (messageIndex !== -1) {
            // Found the message, update it
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              message: updatedMessages[messageIndex].message + chunk
            };
          }
          
          return updatedMessages;
        });
      };
      
      // Use streaming API with max tokens setting and system prompt if needed
      const streamOptions = {
        model: selectedModel,
        maxTokens: 1000, // Reasonable default
        temperature: 0.7, // Balanced creativity
        // Optional system prompt can be added here if needed
        // systemPrompt: "You are a helpful assistant."
      };
      
      try {
        console.log("[DEBUG] ChatInterface: Starting streaming request");
        await llmClient.generateTextStream(message, handleStreamChunk, streamOptions);
        console.log("[DEBUG] ChatInterface: Streaming completed successfully");
      } catch (streamError) {
        console.error("[ERROR] ChatInterface: Streaming error:", streamError);
        
        // Update the message with error info if streaming fails
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const messageIndex = updatedMessages.findIndex(msg => msg.id === responseId);
          
          if (messageIndex !== -1 && !updatedMessages[messageIndex].message) {
            // Only update if message is still empty (streaming failed immediately)
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              message: "Sorry, I encountered an error processing your request. Please try again."
            };
          }
          
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error("[ERROR] ChatInterface: Fatal error in handleSend:", error);
      
      // Add error message to chat if something catastrophic happens
      const errorMessage: ChatMessage = {
        message: "Sorry, I encountered a critical error processing your request. Please check your connection and try again.",
        sender: "AI Assistant",
        direction: "incoming",
        sentTime: new Date().toLocaleTimeString(),
        id: "error-" + Date.now()
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      // Hide typing indicator
      setIsTyping(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      overflow: 'hidden'
    }}>
      <MessageList 
        ref={messageListRef}
        messages={messages}
        isTyping={isTyping}
      />
      
      <ChatInput 
        inputMessage={inputMessage}
        selectedModel={selectedModel}
        onInputChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onSend={handleSend}
        onModelChange={handleModelChange}
      />
    </div>
  );
};

export default ChatInterface; 