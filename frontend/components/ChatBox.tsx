
import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { SendIcon, UserIcon, BotIcon, LoadingSpinner } from './icons';

interface ChatBoxProps {
  history: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ history, onSendMessage, isLoading }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 h-full flex flex-col p-4">
      <h2 className="text-xl font-bold text-slate-800 mb-4 px-2">Follow-up Questions</h2>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {history.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <BotIcon className="w-8 h-8 flex-shrink-0 text-white bg-blue-600 rounded-full p-1.5" />}
            <div className={`max-w-md p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              <p className="text-sm leading-relaxed">{msg.parts}</p>
            </div>
             {msg.role === 'user' && <UserIcon className="w-8 h-8 flex-shrink-0 text-white bg-slate-500 rounded-full p-1" />}
          </div>
        ))}
         {isLoading && (
            <div className="flex items-start gap-3">
              <BotIcon className="w-8 h-8 flex-shrink-0 text-white bg-blue-600 rounded-full p-1.5" />
              <div className="max-w-md p-3 rounded-2xl bg-slate-100 text-slate-800 rounded-bl-none">
                <div className="flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s] mx-1"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
        <div ref={chatEndRef} />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !newMessage}
          className="p-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;