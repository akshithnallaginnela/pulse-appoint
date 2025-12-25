import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import Chatbot from './Chatbot';

export const ChatbotButton: React.FC = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    return (
        <>
            {/* Floating Action Button */}
            {!isChatOpen && (
                <Button
                    size="lg"
                    className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-300 transform hover:scale-110"
                    onClick={() => setIsChatOpen(true)}
                >
                    <MessageCircle className="h-7 w-7 text-white" />
                    <span className="sr-only">Open chatbot</span>

                    {/* Pulse animation */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                </Button>
            )}

            {/* Chatbot Component */}
            <Chatbot
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />
        </>
    );
};

export default ChatbotButton;
