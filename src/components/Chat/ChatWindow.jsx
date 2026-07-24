import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="message-avatar assistant" style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'var(--glass-20)', border: '1px solid var(--glass-border)' }}>
        ⬡
      </div>
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const { documents, settings } = useApp();
  const hasKey = !!settings.apiKey;
  const hasDocs = documents.length > 0;

  return (
    <div className="chat-welcome">
      <div className="welcome-orb">⬡</div>
      <div className="welcome-title">yusrababari</div>
      <div className="welcome-sub">
        Your context-aware knowledge assistant. Upload documents and chat with your own data using RAG.
      </div>
      <div className="welcome-steps">
        <div className="welcome-step" style={{ opacity: hasKey ? 1 : 0.5 }}>
          <div className="step-num" style={{ background: hasKey ? 'var(--grad-main)' : 'var(--glass-20)' }}>
            {hasKey ? '✓' : '1'}
          </div>
          <span>{hasKey ? 'API key configured' : 'Add your OpenRouter API key in Settings'}</span>
        </div>
        <div className="welcome-step" style={{ opacity: hasDocs ? 1 : 0.5 }}>
          <div className="step-num" style={{ background: hasDocs ? 'var(--grad-main)' : 'var(--glass-20)' }}>
            {hasDocs ? '✓' : '2'}
          </div>
          <span>{hasDocs ? `${documents.length} document${documents.length !== 1 ? 's' : ''} loaded` : 'Upload documents to the knowledge base'}</span>
        </div>
        <div className="welcome-step" style={{ opacity: hasKey && hasDocs ? 1 : 0.3 }}>
          <div className="step-num" style={{ background: 'var(--glass-20)' }}>3</div>
          <span>Ask questions — get grounded, cited answers</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { messages, isLoading, error, dispatch } = useApp();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showWelcome = messages.length === 0;

  return (
    <div className="chat-area">
      {/* Error banner */}
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="error-banner-close"
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
        {showWelcome ? (
          <WelcomeScreen />
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
