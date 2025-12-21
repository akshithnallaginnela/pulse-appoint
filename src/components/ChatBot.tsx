import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, User, Bot, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import api from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface DoctorCard {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  fee: number;
  rating: number;
  bio?: string;
}

interface AppointmentCard {
  id: string;
  doctorName: string;
  specialization: string;
  date: Date;
  time: string;
  status: string;
  fee?: number;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [doctorCards, setDoctorCards] = useState<DoctorCard[]>([]);
  const [appointments, setAppointments] = useState<AppointmentCard[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, doctorCards, appointments]);

  // Initialize chatbot session
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen]);

  const initializeSession = async () => {
    try {
      const response = await api.chatbotAPI.newSession();
      if (response.success) {
        setSessionId(response.sessionId);
        // Send initial greeting
        addMessage('assistant', "Hello! 👋 I'm your healthcare assistant. How can I help you today?");
        setSuggestions(['📅 Book Appointment', '👨‍⚕️ Find Doctors', '📋 My Appointments', '❓ Help']);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      addMessage('assistant', "Hello! I'm here to help you with your appointments. What can I do for you?");
      setSuggestions(['📅 Book Appointment', '👨‍⚕️ Find Doctors', '📋 My Appointments', '❓ Help']);
    }
  };

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async (message?: string) => {
    const textToSend = message || inputMessage.trim();
    
    if (!textToSend) return;

    // Add user message to UI
    addMessage('user', textToSend);
    setInputMessage('');
    setIsTyping(true);

    // Clear previous suggestions and cards
    setSuggestions([]);
    setDoctorCards([]);
    setAppointments([]);

    try {
      const response = await api.chatbotAPI.sendMessage(textToSend, sessionId || undefined);

      if (response.success) {
        // Simulate typing delay
        setTimeout(() => {
          setIsTyping(false);
          addMessage('assistant', response.response);
          
          // Update session ID if new
          if (response.sessionId && !sessionId) {
            setSessionId(response.sessionId);
          }

          // Update suggestions
          if (response.suggestions?.length > 0) {
            setSuggestions(response.suggestions);
          }

          // Update doctor cards
          if (response.doctorCards?.length > 0) {
            setDoctorCards(response.doctorCards);
          }

          // Update appointments
          if (response.appointments?.length > 0) {
            setAppointments(response.appointments);
          }
        }, 800);
      }
    } catch (error: any) {
      setIsTyping(false);
      addMessage('assistant', "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.");
      console.error('Error sending message:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser.');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-[420px] shadow-2xl transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'} flex flex-col`}>
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-t-lg flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-white">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">Healthcare Assistant</CardTitle>
              <CardDescription className="text-blue-100 text-xs">Always here to help</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-blue-700"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-blue-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}>
                          {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <span className={`text-xs mt-1 block ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-200 text-gray-700">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor Cards */}
                  {doctorCards.length > 0 && (
                    <div className="space-y-2">
                      {doctorCards.map((doctor) => (
                        <Card key={doctor.id} className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{doctor.name}</h4>
                                <p className="text-sm text-gray-600">{doctor.specialization}</p>
                                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                  <span>⭐ {doctor.rating.toFixed(1)}</span>
                                  <span>🎓 {doctor.experience} years</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  ₹{doctor.fee}
                                </Badge>
                              </div>
                            </div>
                            {doctor.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doctor.bio}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Appointment Cards */}
                  {appointments.length > 0 && (
                    <div className="space-y-2">
                      {appointments.map((apt, index) => (
                        <Card key={apt.id} className="border border-blue-200 bg-blue-50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">Appointment #{index + 1}</h4>
                                <p className="text-sm text-gray-700">{apt.doctorName}</p>
                                <p className="text-xs text-gray-600">{apt.specialization}</p>
                                <div className="flex gap-3 mt-2 text-xs">
                                  <span>📅 {new Date(apt.date).toLocaleDateString()}</span>
                                  <span>🕐 {apt.time}</span>
                                </div>
                              </div>
                              <Badge className="capitalize">{apt.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-full hover:bg-blue-50 hover:text-blue-600 border-blue-200"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Input Area */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isTyping}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className={`rounded-full ${isListening ? 'bg-red-100 text-red-600' : 'hover:bg-gray-200'}`}
                  onClick={startVoiceInput}
                  disabled={isTyping}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isTyping}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Powered by AI • Your health companion
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Chatbot;
