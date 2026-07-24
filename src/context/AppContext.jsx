/**
 * AppContext.jsx — Global state management for yusrababari
 */
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { chunkText, extractText } from '../engine/chunker.js';
import { buildTFIDFIndex, retrieveTFIDF } from '../engine/tfidf.js';
import { embedDocuments, retrieveSemantic } from '../engine/embeddings.js';
import { streamChat, buildRAGPrompt } from '../engine/llm.js';

const AppContext = createContext(null);

const DEFAULT_SETTINGS = {
  apiKey: localStorage.getItem('yr_apiKey') || '',
  chatModel: 'openai/gpt-4o-mini',
  retrievalMode: 'tfidf', // 'tfidf' | 'embeddings'
  embeddingModel: 'openai/text-embedding-3-small',
  topK: 3,
  chunkSize: 600,
  chunkOverlap: 100,
};

const initialState = {
  documents: [],
  messages: [],
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isEmbedding: false,
  embedProgress: { done: 0, total: 0 },
  tfidfIndex: null,
  embeddedChunks: [],
  error: null,
  sidebarTab: 'kb', // 'kb' | 'settings'
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_DOCUMENT': {
      const newDocs = [...state.documents, action.doc];
      return {
        ...state,
        documents: newDocs,
        tfidfIndex: null,
        embeddedChunks: [],
        error: null
      };
    }
    case 'REMOVE_DOCUMENT': {
      const newDocs = state.documents.filter(d => d.id !== action.id);
      return {
        ...state,
        documents: newDocs,
        tfidfIndex: null,
        embeddedChunks: [],
      };
    }
    case 'SET_TFIDF_INDEX':
      return { ...state, tfidfIndex: action.index };
    case 'SET_EMBEDDED_CHUNKS':
      return { ...state, embeddedChunks: action.chunks, isEmbedding: false };
    case 'SET_EMBEDDING': 
      return { ...state, isEmbedding: action.value, embedProgress: { done: 0, total: 0 } };
    case 'SET_EMBED_PROGRESS':
      return { ...state, embedProgress: action.progress };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'UPDATE_LAST_MESSAGE': {
      const msgs = [...state.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...action.updates };
      return { ...state, messages: msgs };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'CLEAR_CHAT':
      return { ...state, messages: [] };
    case 'CLEAR_KB':
      return { ...state, documents: [], tfidfIndex: null, embeddedChunks: [], messages: [] };
    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.settings };
      // Persist API key to localStorage
      if (action.settings.apiKey !== undefined) {
        localStorage.setItem('yr_apiKey', action.settings.apiKey);
      }
      return {
        ...state,
        settings: newSettings,
        // Reset index when retrieval mode changes
        tfidfIndex: action.settings.retrievalMode ? null : state.tfidfIndex,
        embeddedChunks: action.settings.retrievalMode ? [] : state.embeddedChunks
      };
    }
    case 'SET_SIDEBAR_TAB':
      return { ...state, sidebarTab: action.tab };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * Add a document to the knowledge base
   */
  const addDocument = useCallback(async (file) => {
    try {
      const text = await extractText(file);
      const chunks = chunkText(text, state.settings.chunkSize, state.settings.chunkOverlap);
      const doc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        chunks,
        addedAt: new Date().toISOString(),
        wordCount: text.split(/\s+/).length
      };
      dispatch({ type: 'ADD_DOCUMENT', doc });
      dispatch({ type: 'SET_ERROR', error: null });
      return doc;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Failed to process "${file.name}": ${err.message}` });
      throw err;
    }
  }, [state.settings.chunkSize, state.settings.chunkOverlap]);

  /**
   * Add a document from pasted text
   */
  const addTextDocument = useCallback((name, text) => {
    const chunks = chunkText(text, state.settings.chunkSize, state.settings.chunkOverlap);
    const doc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name || 'Pasted Text',
      size: text.length,
      type: 'text/plain',
      chunks,
      addedAt: new Date().toISOString(),
      wordCount: text.split(/\s+/).length
    };
    dispatch({ type: 'ADD_DOCUMENT', doc });
    return doc;
  }, [state.settings.chunkSize, state.settings.chunkOverlap]);

  /**
   * Remove a document
   */
  const removeDocument = useCallback((id) => {
    dispatch({ type: 'REMOVE_DOCUMENT', id });
  }, []);

  /**
   * Build TF-IDF index from current documents
   */
  const buildIndex = useCallback(() => {
    if (state.documents.length === 0) return;
    const index = buildTFIDFIndex(state.documents);
    dispatch({ type: 'SET_TFIDF_INDEX', index });
    return index;
  }, [state.documents]);

  /**
   * Build embedding index from current documents
   */
  const buildEmbeddingIndex = useCallback(async () => {
    if (state.documents.length === 0) return;
    if (!state.settings.apiKey) {
      dispatch({ type: 'SET_ERROR', error: 'API key required for embedding mode' });
      return;
    }
    dispatch({ type: 'SET_EMBEDDING', value: true });
    try {
      const chunks = await embedDocuments(
        state.documents,
        state.settings.apiKey,
        state.settings.embeddingModel,
        (done, total) => dispatch({ type: 'SET_EMBED_PROGRESS', progress: { done, total } })
      );
      dispatch({ type: 'SET_EMBEDDED_CHUNKS', chunks });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Embedding failed: ${err.message}` });
      dispatch({ type: 'SET_EMBEDDING', value: false });
    }
  }, [state.documents, state.settings.apiKey, state.settings.embeddingModel]);

  /**
   * Send a message and get a RAG-powered response
   */
  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim()) return;
    if (!state.settings.apiKey) {
      dispatch({ type: 'SET_ERROR', error: 'Please add your OpenRouter API key in Settings.' });
      return;
    }

    // Add user message
    const userMsg = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toISOString()
    };
    dispatch({ type: 'ADD_MESSAGE', message: userMsg });
    dispatch({ type: 'SET_LOADING', value: true });
    dispatch({ type: 'CLEAR_ERROR' });

    // Retrieve relevant chunks
    let retrieved = [];
    try {
      if (state.settings.retrievalMode === 'embeddings') {
        // Ensure we have embeddings
        let chunks = state.embeddedChunks;
        if (chunks.length === 0 && state.documents.length > 0) {
          await buildEmbeddingIndex();
          chunks = state.embeddedChunks; // state won't update in same render; we'll handle below
        }
        if (chunks.length > 0) {
          retrieved = await retrieveSemantic(
            userText,
            chunks,
            state.settings.apiKey,
            state.settings.embeddingModel,
            state.settings.topK
          );
        }
      } else {
        // TF-IDF mode
        let index = state.tfidfIndex;
        if (!index && state.documents.length > 0) {
          index = buildTFIDFIndex(state.documents);
          dispatch({ type: 'SET_TFIDF_INDEX', index });
        }
        if (index) {
          retrieved = retrieveTFIDF(userText, index, state.settings.topK);
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: `Retrieval error: ${err.message}` });
    }

    // Build conversation history (last 10 turns)
    const history = state.messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));
    const ragPrompt = buildRAGPrompt(userText, retrieved);

    // Add placeholder assistant message
    const assistantMsg = {
      id: `msg_${Date.now()}_a`,
      role: 'assistant',
      content: '',
      sources: retrieved,
      timestamp: new Date().toISOString(),
      streaming: true
    };
    dispatch({ type: 'ADD_MESSAGE', message: assistantMsg });

    // Stream response
    try {
      const abortController = new AbortController();
      await streamChat(
        [...history, { role: 'user', content: ragPrompt }],
        state.settings.apiKey,
        state.settings.chatModel,
        (_delta, fullContent) => {
          dispatch({ type: 'UPDATE_LAST_MESSAGE', updates: { content: fullContent, streaming: true } });
        },
        (fullContent) => {
          dispatch({ type: 'UPDATE_LAST_MESSAGE', updates: { content: fullContent, streaming: false } });
        },
        abortController.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        dispatch({ type: 'UPDATE_LAST_MESSAGE', updates: { content: `Error: ${err.message}`, streaming: false } });
        dispatch({ type: 'SET_ERROR', error: err.message });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }, [state.settings, state.documents, state.tfidfIndex, state.embeddedChunks, state.messages, buildEmbeddingIndex]);

  const value = {
    ...state,
    addDocument,
    addTextDocument,
    removeDocument,
    buildIndex,
    buildEmbeddingIndex,
    sendMessage,
    dispatch
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
