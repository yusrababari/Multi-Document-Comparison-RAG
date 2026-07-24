import React from 'react';
import { Hexagon, BookOpen, Settings, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function Header() {
  const { documents, settings, isLoading, tfidfIndex, embeddedChunks } = useApp();

  const isIndexed = settings.retrievalMode === 'tfidf'
    ? !!tfidfIndex
    : embeddedChunks.length > 0;

  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">⬡</div>
        <div>
          <div className="header-logo-text">yusrababari</div>
          <div className="header-logo-sub">Knowledge Assistant</div>
        </div>
      </div>

      <div className="header-right">
        {documents.length > 0 && (
          <div className={`header-badge ${isIndexed ? 'active' : ''}`}>
            {isIndexed ? (
              <><Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
                {settings.retrievalMode === 'embeddings' ? 'Semantic' : 'TF-IDF'} Ready</>
            ) : (
              'Index Pending'
            )}
          </div>
        )}
        <div className="header-badge">
          <BookOpen size={10} style={{ display: 'inline', marginRight: 4 }} />
          {documents.length} doc{documents.length !== 1 ? 's' : ''}
        </div>
        <div className="header-badge">
          {settings.chatModel.split('/')[1] || settings.chatModel}
        </div>
      </div>
    </header>
  );
}
