import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../services/api';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: '👋 Hi! I\'m your **QuantumShield Assistant**. Ask me about scan results, PQC scores, compliance, or anything about this platform.',
      time: new Date(),
    },
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const location = useLocation();
  const currentPage = location.pathname;

  // Fetch suggestions when page changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const { data } = await API.get(`/chatbot/suggestions?page=${currentPage}`);
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [currentPage]);

  const toggleChat = useCallback(() => setIsOpen(prev => !prev), []);
  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(async (question) => {
    if (!question.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question.trim(),
      time: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const { data } = await API.post('/chatbot/ask', { question: question.trim(), page: currentPage });

      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: data.answer || 'Sorry, I couldn\'t process that.',
        time: new Date(),
        confidence: data.confidence,
        intent: data.intent,
      };
      setMessages(prev => [...prev, botMsg]);

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `bot-err-${Date.now()}`,
        role: 'bot',
        text: 'Sorry, something went wrong. Please try again.',
        time: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [currentPage]);

  // Keyboard shortcut: Ctrl+/ to toggle
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleChat();
      }
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleChat, closeChat, isOpen]);

  return (
    <ChatContext.Provider value={{
      isOpen, toggleChat, closeChat,
      messages, sendMessage,
      suggestions, isTyping, currentPage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
