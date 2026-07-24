import React, { useState } from 'react';
import { Eye, EyeOff, Key, Cpu, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { CHAT_MODELS, EMBEDDING_MODELS } from '../../engine/llm.js';

export default function SettingsPanel() {
  const { settings, dispatch } = useApp();
  const [showKey, setShowKey] = useState(false);

  const update = (patch) => dispatch({ type: 'UPDATE_SETTINGS', settings: patch });

  return (
    <div className="sidebar-content">
      {/* API Key */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Key size={12} style={{ display: 'inline', marginRight: 6 }} />
          OpenRouter API
        </div>

        <div className="form-group">
          <label className="form-label">API Key</label>
          <div className="input-with-eye">
            <input
              id="api-key-input"
              type={showKey ? 'text' : 'password'}
              className="form-input"
              placeholder="sk-or-..."
              value={settings.apiKey}
              onChange={e => update({ apiKey: e.target.value })}
              autoComplete="off"
            />
            <button
              className="eye-btn"
              onClick={() => setShowKey(v => !v)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-600)', marginTop: 4 }}>
            Get your key at{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
               style={{ color: 'var(--purple-400)', textDecoration: 'none' }}>
              openrouter.ai/keys
            </a>
            . Stored locally only.
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* Chat Model */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Cpu size={12} style={{ display: 'inline', marginRight: 6 }} />
          Chat Model
        </div>
        <div className="form-group">
          <label className="form-label">Model</label>
          <select
            id="chat-model-select"
            className="form-select"
            value={settings.chatModel}
            onChange={e => update({ chatModel: e.target.value })}
          >
            {CHAT_MODELS.map(m => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.desc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="divider" />

      {/* Retrieval */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Search size={12} style={{ display: 'inline', marginRight: 6 }} />
          Retrieval Mode
        </div>

        <div className="form-group">
          <label className="form-label">Method</label>
          <div className="toggle-group">
            <button
              className={`toggle-option ${settings.retrievalMode === 'tfidf' ? 'active' : ''}`}
              onClick={() => update({ retrievalMode: 'tfidf' })}
              id="toggle-tfidf"
            >
              TF-IDF
            </button>
            <button
              className={`toggle-option ${settings.retrievalMode === 'embeddings' ? 'active' : ''}`}
              onClick={() => update({ retrievalMode: 'embeddings' })}
              id="toggle-embeddings"
            >
              Semantic
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-600)', marginTop: 4 }}>
            {settings.retrievalMode === 'tfidf'
              ? 'Fast keyword matching. No extra API calls.'
              : 'Deep semantic search. Uses embedding API calls per document.'}
          </div>
        </div>

        {settings.retrievalMode === 'embeddings' && (
          <div className="form-group">
            <label className="form-label">Embedding Model</label>
            <select
              id="embedding-model-select"
              className="form-select"
              value={settings.embeddingModel}
              onChange={e => update({ embeddingModel: e.target.value })}
            >
              {EMBEDDING_MODELS.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* Retrieval parameters */}
      <div className="settings-section">
        <div className="settings-section-title">
          <SlidersHorizontal size={12} style={{ display: 'inline', marginRight: 6 }} />
          Parameters
        </div>

        <div className="form-group">
          <label className="form-label">Top-K Chunks</label>
          <input
            type="range"
            className="range-input"
            id="topk-slider"
            min={1}
            max={8}
            value={settings.topK}
            onChange={e => update({ topK: Number(e.target.value) })}
          />
          <div className="range-display">
            <span style={{ fontSize: 11, color: 'var(--text-600)' }}>Retrieve top</span>
            <span className="range-value">{settings.topK} chunk{settings.topK !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Chunk Size (chars)</label>
          <input
            type="range"
            className="range-input"
            id="chunksize-slider"
            min={200}
            max={1200}
            step={100}
            value={settings.chunkSize}
            onChange={e => update({ chunkSize: Number(e.target.value) })}
          />
          <div className="range-display">
            <span style={{ fontSize: 11, color: 'var(--text-600)' }}>Size</span>
            <span className="range-value">{settings.chunkSize}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-600)', marginTop: 2 }}>
            ⚠ Re-ingest documents after changing chunk size.
          </div>
        </div>
      </div>
    </div>
  );
}
