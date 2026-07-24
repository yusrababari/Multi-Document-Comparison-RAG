import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Very lightweight markdown renderer — handles the most common cases.
 * For a full implementation, you'd use react-markdown, but we keep it dependency-free.
 */
function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i}>
          <code className={lang ? `language-${lang}` : ''}>
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i}>{line.slice(2)}</h1>);
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{inlineFormat(line.slice(2))}</blockquote>);
    }
    // Unordered list
    else if (line.match(/^[-*+] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*+] /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }
    // Ordered list
    else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }
    // Empty line
    else if (line.trim() === '') {
      // skip, handled by margins
    }
    // Regular paragraph
    else {
      elements.push(<p key={i}>{inlineFormat(line)}</p>);
    }

    i++;
  }

  return elements;
}

function inlineFormat(text) {
  // Process bold, italic, code inline
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index}>{match[4]}</code>);
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      className={`action-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      aria-label="Copy message"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function SourceChips({ sources }) {
  const [expanded, setExpanded] = useState(null);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="sources">
        {sources.map((s, i) => (
          <button
            key={i}
            className="source-chip"
            onClick={() => setExpanded(expanded === i ? null : i)}
            aria-expanded={expanded === i}
            title={`From: ${s.docName}`}
          >
            <span>📌 {s.docName}</span>
            <span className="source-score">{Math.round(s.score * 100)}%</span>
          </button>
        ))}
      </div>
      {expanded !== null && sources[expanded] && (
        <div className="source-preview">
          <div style={{ fontSize: 10, color: 'var(--purple-400)', marginBottom: 6, fontWeight: 600 }}>
            📌 {sources[expanded].docName} · Chunk #{sources[expanded].chunk.index + 1}
          </div>
          {sources[expanded].chunk.text}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {/* Meta row */}
      <div className="message-meta" style={{ flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <div className={`message-avatar ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? '👤' : '⬡'}
        </div>
        <span>{isUser ? 'You' : 'yusrababari'}</span>
        <span>{time}</span>
      </div>

      {/* Bubble */}
      <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
        <div className="bubble-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <>
              {renderMarkdown(message.content)}
              {message.streaming && <span className="streaming-cursor" />}
            </>
          )}
        </div>
      </div>

      {/* Sources */}
      {!isUser && !message.streaming && message.sources?.length > 0 && (
        <SourceChips sources={message.sources} />
      )}

      {/* Actions */}
      {!message.streaming && (
        <div className="bubble-actions">
          <CopyButton text={message.content} />
        </div>
      )}
    </div>
  );
}
