import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

const EXT_ICONS = {
  pdf: { icon: '📕', cls: 'pdf' },
  md: { icon: '📝', cls: 'md' },
  txt: { icon: '📄', cls: 'txt' },
  csv: { icon: '📊', cls: 'other' },
  json: { icon: '🔧', cls: 'other' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function DocumentCard({ doc }) {
  const { removeDocument } = useApp();
  const ext = doc.name.split('.').pop().toLowerCase();
  const { icon, cls } = EXT_ICONS[ext] || { icon: '📄', cls: 'other' };

  return (
    <div className="doc-card">
      <div className={`doc-icon ${cls}`}>{icon}</div>
      <div className="doc-info">
        <div className="doc-name" title={doc.name}>{doc.name}</div>
        <div className="doc-meta">
          <span>{doc.chunks.length} chunks</span>
          <span>·</span>
          <span>{doc.wordCount?.toLocaleString() || '?'} words</span>
          {doc.size && <><span>·</span><span>{formatBytes(doc.size)}</span></>}
        </div>
        <div style={{ marginTop: 4 }}>
          <span className="doc-chip">{ext.toUpperCase()}</span>
        </div>
      </div>
      <button
        className="doc-remove"
        onClick={() => removeDocument(doc.id)}
        aria-label={`Remove ${doc.name}`}
        title="Remove document"
      >
        <X size={14} />
      </button>
    </div>
  );
}
