import { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageCircle, X, Send, Shield, Bot, Sparkles, Minus, Maximize2, Minimize2, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import API from '../services/api';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Simple markdown-like bold rendering
function renderBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function renderMessage(text) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line.startsWith('• ') ? (
        <span style={{ display: 'block', paddingLeft: 8 }}>• {renderBold(line.slice(2))}</span>
      ) : (
        renderBold(line)
      )}
      {i < text.split('\n').length - 1 && <br />}
    </span>
  ));
}

export default function ChatBot() {
  const {
    isOpen, toggleChat, closeChat,
    messages, sendMessage,
    suggestions, isTyping,
  } = useChat();

  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [mode, setMode] = useState('assistant'); // 'assistant' or 'gemini'
  const [geminiMessages, setGeminiMessages] = useState([
    {
      id: 'gemini-welcome',
      role: 'bot',
      text: '✨ Hi! I\'m **Gemini AI**, powered by Google. Ask me anything about the **QuantumShield** project — architecture, algorithms, code implementation, or PQC concepts!',
      time: new Date(),
    },
  ]);
  const [geminiTyping, setGeminiTyping] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const activeMessages = mode === 'gemini' ? geminiMessages : messages;
  const activeTyping = mode === 'gemini' ? geminiTyping : isTyping;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, activeTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, minimized]);

  const sendGeminiMessage = async (question) => {
    if (!question.trim()) return;

    const userMsg = {
      id: `gemini-user-${Date.now()}`,
      role: 'user',
      text: question.trim(),
      time: new Date(),
    };
    setGeminiMessages(prev => [...prev, userMsg]);
    setGeminiTyping(true);

    try {
      const { data } = await API.post('/gemini/ask', {
        question: question.trim(),
        sessionId,
      });

      const botMsg = {
        id: `gemini-bot-${Date.now()}`,
        role: 'bot',
        text: data.answer || 'Sorry, I couldn\'t process that.',
        time: new Date(),
        source: 'gemini',
      };
      setGeminiMessages(prev => [...prev, botMsg]);
    } catch {
      setGeminiMessages(prev => [...prev, {
        id: `gemini-err-${Date.now()}`,
        role: 'bot',
        text: 'Sorry, Gemini AI is currently unavailable. Please try again or switch to the built-in assistant.',
        time: new Date(),
      }]);
    } finally {
      setGeminiTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (mode === 'gemini') {
      sendGeminiMessage(input);
    } else {
      sendMessage(input);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    if (mode === 'gemini') {
      sendGeminiMessage(text);
    } else {
      sendMessage(text);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'assistant' ? 'gemini' : 'assistant');
  };

  // Gemini-specific suggestions
  const geminiSuggestions = [
    { text: 'Explain the project architecture', icon: 'layers' },
    { text: 'What algorithms are used?', icon: 'cpu' },
    { text: 'How does the scanner engine work?', icon: 'search' },
    { text: 'Why is PQC important for banks?', icon: 'shield' },
  ];

  const activeSuggestions = mode === 'gemini' ? geminiSuggestions : suggestions;

  // Floating Action Button
  const fab = (
    <button
      className={`chatbot-fab ${isOpen ? 'hidden' : ''}`}
      onClick={toggleChat}
      title="QuantumShield Assistant (Ctrl+/)"
      aria-label="Open chat assistant"
    >
      <MessageCircle size={24} />
      <span className="chatbot-fab-pulse" />
    </button>
  );

  // Chat Panel
  const panel = isOpen && (
    <div className={`chatbot-panel ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`} role="dialog" aria-label="Chat assistant">
      {/* Header */}
      <div className="chatbot-header" style={mode === 'gemini' ? { background: 'linear-gradient(135deg, #1a73e8 0%, #6c47ff 50%, #e8453c 100%)' } : {}}>
        <div className="chatbot-header-left">
          <div className="chatbot-header-avatar" style={mode === 'gemini' ? { background: 'rgba(255,255,255,0.2)' } : {}}>
            {mode === 'gemini' ? <Zap size={14} /> : <Shield size={14} />}
          </div>
          <div>
            <div className="chatbot-header-title">
              {mode === 'gemini' ? 'Gemini AI' : 'QuantumShield AI'}
            </div>
            <div className="chatbot-header-status">
              <span className="chatbot-status-dot" />
              {mode === 'gemini' ? 'Powered by Google' : 'Online'}
            </div>
          </div>
        </div>
        <div className="chatbot-header-actions">
          <button onClick={() => setMinimized(m => !m)} className="chatbot-header-btn" title={minimized ? 'Expand' : 'Minimize'}>
            <Minus size={16} />
          </button>
          <button onClick={() => { setMaximized(m => !m); setMinimized(false); }} className="chatbot-header-btn" title={maximized ? 'Restore' : 'Maximize'}>
            {maximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => { closeChat(); setMaximized(false); }} className="chatbot-header-btn" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      {!minimized && (
        <div className="chatbot-mode-toggle">
          <button
            className={`chatbot-mode-btn ${mode === 'assistant' ? 'active' : ''}`}
            onClick={() => setMode('assistant')}
          >
            <Shield size={14} />
            <span>Assistant</span>
          </button>
          <button
            className={`chatbot-mode-btn ${mode === 'gemini' ? 'active' : ''}`}
            onClick={() => setMode('gemini')}
          >
            <Zap size={14} />
            <span>Gemini AI</span>
          </button>
        </div>
      )}

      {/* Messages */}
      {!minimized && (
        <>
          <div className="chatbot-messages">
            {activeMessages.map(msg => (
              <div key={msg.id} className={`chatbot-msg ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="chatbot-msg-avatar" style={mode === 'gemini' ? { background: 'linear-gradient(135deg, #4285f4, #a259ff)' } : {}}>
                    {mode === 'gemini' ? <Zap size={14} /> : <Bot size={14} />}
                  </div>
                )}
                <div className="chatbot-msg-content">
                  <div className="chatbot-msg-bubble">
                    {renderMessage(msg.text)}
                  </div>
                  <div className="chatbot-msg-time">{formatTime(msg.time)}</div>
                </div>
              </div>
            ))}

            {activeTyping && (
              <div className="chatbot-msg bot">
                <div className="chatbot-msg-avatar" style={mode === 'gemini' ? { background: 'linear-gradient(135deg, #4285f4, #a259ff)' } : {}}>
                  {mode === 'gemini' ? <Zap size={14} /> : <Bot size={14} />}
                </div>
                <div className="chatbot-msg-content">
                  <div className="chatbot-msg-bubble chatbot-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {activeSuggestions.length > 0 && (
            <div className="chatbot-suggestions">
              <Sparkles size={12} className="chatbot-suggestions-icon" />
              {activeSuggestions.map((s, i) => (
                <button
                  key={i}
                  className={`chatbot-suggestion-pill ${s.priority ? 'priority' : ''}`}
                  onClick={() => handleSuggestionClick(s.text)}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder={mode === 'gemini' ? 'Ask Gemini about the project...' : 'Ask about your data...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Type your question"
            />
            <button
              className="chatbot-send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
              style={mode === 'gemini' ? { background: 'linear-gradient(135deg, #4285f4, #a259ff)' } : {}}
            >
              <Send size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {fab}
      {panel}
    </>
  );
}
