import { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { MessageCircle, X, Send, Shield, Bot, Sparkles, Minus, Maximize2, Minimize2 } from 'lucide-react';

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, minimized]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text) => {
    sendMessage(text);
  };

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
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="chatbot-header-avatar">
            <Shield size={14} />
          </div>
          <div>
            <div className="chatbot-header-title">
              QuantumShield AI
            </div>
            <div className="chatbot-header-status">
              <span className="chatbot-status-dot" />
              Online — Privacy-Safe
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

      {/* Messages */}
      {!minimized && (
        <>
          <div className="chatbot-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chatbot-msg ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="chatbot-msg-avatar">
                    <Bot size={14} />
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

            {isTyping && (
              <div className="chatbot-msg bot">
                <div className="chatbot-msg-avatar">
                  <Bot size={14} />
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
          {suggestions.length > 0 && (
            <div className="chatbot-suggestions">
              <Sparkles size={12} className="chatbot-suggestions-icon" />
              {suggestions.map((s, i) => (
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
              placeholder="Ask about your scan data..."
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
