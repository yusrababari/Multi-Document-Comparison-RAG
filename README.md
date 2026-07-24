# ⬡ yusrababari — Context-Aware Knowledge Assistant RAG Chatbot

A **premium, fully in-browser RAG (Retrieval-Augmented Generation) chatbot** built with React + Vite. Upload your documents and chat with your own knowledge base using AI — no backend required.

![yusrababari RAG Chatbot](https://img.shields.io/badge/RAG-Chatbot-7c3aed?style=for-the-badge&logo=react)
![OpenRouter](https://img.shields.io/badge/Powered%20by-OpenRouter-4f46e5?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)

---

## ✨ Features

- **Full RAG Pipeline** — Upload documents → chunk → retrieve → generate grounded answers
- **Dual Retrieval Modes**:
  - 🔤 **TF-IDF** — Fast in-browser keyword search, zero API calls
  - 🧠 **Semantic (Embeddings)** — Deep semantic search via OpenRouter embedding models
- **Streaming Responses** — Real-time streamed answers with a live cursor
- **Source Citations** — Every answer cites exact document chunks with relevance scores
- **Multi-format Support** — `.txt`, `.md`, `.pdf`, `.csv`, `.json` + paste raw text
- **7 Chat Models** — GPT-4o, Claude 3.5 Sonnet, Gemini Flash, Llama 3.1, and more via OpenRouter
- **Premium Dark UI** — Glassmorphism design with smooth animations

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yusrababari/Context-Aware-Knowledge-Assistant-RAG-Chatbot-.git
cd Context-Aware-Knowledge-Assistant-RAG-Chatbot-
npm install
npm run dev
```

Open **http://localhost:5173**

### 2. Configure

1. Click **Settings** in the sidebar
2. Enter your [OpenRouter API key](https://openrouter.ai/keys) (stored locally, never sent anywhere except OpenRouter)
3. Choose your **chat model** and **retrieval mode**

### 3. Add Documents

1. Click **"Add Document"** in the Knowledge Base panel
2. Upload `.txt`, `.md`, or `.pdf` files — or paste text directly
3. Click **"Build Index"** to index your documents

### 4. Chat!

Ask anything about your documents. The assistant retrieves the most relevant chunks and generates a grounded, cited answer.

---

## 🏗 Architecture

```
Browser (React + Vite)
├── Knowledge Base Panel     — Upload & manage documents
├── RAG Engine
│   ├── chunker.js           — Sentence-boundary-aware text splitting
│   ├── tfidf.js             — In-browser TF-IDF cosine retrieval
│   └── embeddings.js        — OpenRouter semantic embedding retrieval
├── LLM Engine (llm.js)      — OpenRouter streaming chat completions
└── Chat UI                  — Streaming messages, markdown, source chips
```

---

## ⚙️ Settings

| Setting | Options |
|---|---|
| Chat Model | GPT-4o, GPT-4o Mini, Claude 3.5 Sonnet, Claude Haiku, Gemini Flash 1.5, Llama 3.1 70B, Mixtral 8x7B |
| Retrieval Mode | TF-IDF (fast, free) · Semantic Embeddings (accurate, uses API) |
| Embedding Model | text-embedding-3-small · text-embedding-ada-002 |
| Top-K Chunks | 1–8 |
| Chunk Size | 200–1200 chars |

---

## 🔑 API Key

Get your OpenRouter API key at [openrouter.ai/keys](https://openrouter.ai/keys).  
Your key is stored in `localStorage` and **only ever sent to OpenRouter's API** — never to any third party.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatWindow.jsx      — Main chat area with welcome screen
│   │   ├── MessageBubble.jsx   — Markdown rendering + source citations
│   │   └── ChatInput.jsx       — Auto-resizing textarea
│   ├── KnowledgeBase/
│   │   ├── KBPanel.jsx         — Document list + index controls
│   │   ├── DocumentCard.jsx    — Per-document card with stats
│   │   └── AddDocumentModal.jsx — Upload + paste text modal
│   ├── Settings/
│   │   └── SettingsPanel.jsx   — API key, model, retrieval config
│   └── Header.jsx
├── engine/
│   ├── chunker.js              — Text chunking + file extraction
│   ├── tfidf.js                — TF-IDF index + retrieval
│   ├── embeddings.js           — OpenRouter embeddings
│   └── llm.js                  — OpenRouter chat streaming + model list
├── context/
│   └── AppContext.jsx          — Global state (useReducer)
├── App.jsx
├── main.jsx
└── index.css                   — Full design system (glassmorphism)
```

---

## 📄 License

MIT © yusrababari
