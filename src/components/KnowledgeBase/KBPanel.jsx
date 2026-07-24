import React, { useState } from 'react';
import { Plus, Database, Loader, CheckCircle, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import DocumentCard from './DocumentCard.jsx';
import AddDocumentModal from './AddDocumentModal.jsx';

export default function KBPanel() {
  const {
    documents,
    settings,
    tfidfIndex,
    embeddedChunks,
    isEmbedding,
    embedProgress,
    buildIndex,
    buildEmbeddingIndex,
    dispatch
  } = useApp();

  const [showModal, setShowModal] = useState(false);

  const isIndexed = settings.retrievalMode === 'tfidf'
    ? !!tfidfIndex
    : embeddedChunks.length > 0;

  const handleBuildIndex = () => {
    if (settings.retrievalMode === 'embeddings') {
      buildEmbeddingIndex();
    } else {
      buildIndex();
    }
  };

  const handleClearKB = () => {
    if (window.confirm('Clear all documents and chat history?')) {
      dispatch({ type: 'CLEAR_KB' });
    }
  };

  const embedPct = embedProgress.total > 0
    ? Math.round((embedProgress.done / embedProgress.total) * 100)
    : 0;

  return (
    <div className="sidebar-content">
      {/* Documents section */}
      <div className="kb-header">
        <span className="kb-title">Documents</span>
        {documents.length > 0 && (
          <span className="kb-count">{documents.length}</span>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="kb-empty">
          <div className="kb-empty-icon">📚</div>
          No documents yet.<br />
          Add files to start chatting with your knowledge base.
        </div>
      ) : (
        <>
          {documents.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </>
      )}

      {/* Add document button */}
      <button
        className="btn-add-doc"
        onClick={() => setShowModal(true)}
        id="add-document-btn"
      >
        <Plus size={16} /> Add Document
      </button>

      {/* Embedding progress */}
      {isEmbedding && (
        <div className="embed-progress">
          <div className="progress-label">
            <Loader size={12} className="spin" style={{ display: 'inline', marginRight: 6 }} />
            Embedding chunks… {embedProgress.done}/{embedProgress.total}
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${embedPct}%` }} />
          </div>
        </div>
      )}

      {/* Build index button */}
      {documents.length > 0 && !isEmbedding && (
        <button
          className={`btn-build-index ${isIndexed ? 'built' : ''}`}
          onClick={handleBuildIndex}
          id="build-index-btn"
          title={isIndexed ? 'Rebuild index' : 'Build retrieval index'}
        >
          {isIndexed ? (
            <><CheckCircle size={14} /> Index Ready</>
          ) : (
            <><Database size={14} />
              Build {settings.retrievalMode === 'embeddings' ? 'Embedding' : 'TF-IDF'} Index
            </>
          )}
        </button>
      )}

      {/* Stats */}
      {documents.length > 0 && (
        <>
          <div className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="no-docs-hint">
              {documents.reduce((s, d) => s + d.chunks.length, 0)} total chunks
              · {documents.reduce((s, d) => s + (d.wordCount || 0), 0).toLocaleString()} words
            </div>
          </div>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleClearKB}
            style={{ marginTop: 4 }}
          >
            <Trash2 size={13} /> Clear All
          </button>
        </>
      )}

      {showModal && <AddDocumentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
