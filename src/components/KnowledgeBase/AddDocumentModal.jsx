import React, { useState } from 'react';
import { FileText, X, Plus, Upload, Type } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export default function AddDocumentModal({ onClose }) {
  const { addDocument, addTextDocument } = useApp();
  const [tab, setTab] = useState('file'); // 'file' | 'text'
  const [text, setText] = useState('');
  const [textName, setTextName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [addedFiles, setAddedFiles] = useState([]);

  const handleFiles = async (files) => {
    setProcessing(true);
    setError('');
    const added = [];
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md', 'pdf', 'csv', 'json'].includes(ext)) {
        setError(`Unsupported file type: .${ext}. Use .txt, .md, or .pdf`);
        continue;
      }
      try {
        const doc = await addDocument(file);
        added.push(doc.name);
      } catch (err) {
        setError(err.message);
      }
    }
    setAddedFiles(prev => [...prev, ...added]);
    setProcessing(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleAddText = () => {
    if (!text.trim()) return;
    const name = textName.trim() || `Note ${new Date().toLocaleTimeString()}`;
    addTextDocument(name, text);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Add to Knowledge Base</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'file' ? 'active' : ''}`}
            onClick={() => setTab('file')}
          >
            <Upload size={13} style={{ display: 'inline', marginRight: 6 }} />
            Upload File
          </button>
          <button
            className={`modal-tab ${tab === 'text' ? 'active' : ''}`}
            onClick={() => setTab('text')}
          >
            <Type size={13} style={{ display: 'inline', marginRight: 6 }} />
            Paste Text
          </button>
        </div>

        {tab === 'file' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept=".txt,.md,.pdf,.csv,.json"
                onChange={handleFileInput}
                aria-label="Upload documents"
              />
              <div className="drop-zone-icon">
                {processing ? '⏳' : '📂'}
              </div>
              <div className="drop-zone-text">
                {processing ? 'Processing files...' : 'Drop files here or click to browse'}
              </div>
              <div className="drop-zone-sub">Supports .txt, .md, .pdf, .csv, .json</div>
            </div>

            {addedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {addedFiles.map((name, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green-400)' }}>
                    <span>✓</span> {name}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div style={{ fontSize: 13, color: 'var(--red-400)', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--r-md)' }}>
                {error}
              </div>
            )}

            {addedFiles.length > 0 && (
              <button className="btn btn-primary" onClick={onClose}>
                Done ({addedFiles.length} added)
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Document Name</label>
              <input
                className="form-input"
                placeholder="e.g., Meeting Notes, Research Paper..."
                value={textName}
                onChange={e => setTextName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="form-textarea"
                placeholder="Paste your text, markdown, or any content here..."
                value={text}
                onChange={e => setText(e.target.value)}
                style={{ minHeight: 180 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAddText}
                disabled={!text.trim()}
              >
                <Plus size={16} /> Add Document
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
