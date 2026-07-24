/**
 * embeddings.js — OpenRouter-based semantic embedding retrieval
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Get embeddings for a batch of texts via OpenRouter
 * @param {string[]} texts
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<number[][]>} array of embedding vectors
 */
export async function getEmbeddings(texts, apiKey, model = 'openai/text-embedding-3-small') {
  const response = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yusrababari.app',
      'X-Title': 'yusrababari Knowledge Assistant'
    },
    body: JSON.stringify({
      model,
      input: texts
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Embeddings API error: ${response.status}`);
  }

  const data = await response.json();
  // Sort by index to ensure correct order
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding);
}

/**
 * Cosine similarity between two numeric arrays
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed all chunks in documents (in batches to avoid rate limits)
 * @param {Array} documents - Array of document objects with chunks
 * @param {string} apiKey
 * @param {string} embeddingModel
 * @param {Function} onProgress - callback(done, total)
 * @returns {Array} Flat list of chunks with embeddings attached
 */
export async function embedDocuments(documents, apiKey, embeddingModel, onProgress) {
  const allChunks = [];
  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      allChunks.push({ ...chunk, docId: doc.id, docName: doc.name });
    }
  }

  const BATCH_SIZE = 20;
  const embeddedChunks = [];

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.text);
    const embeddings = await getEmbeddings(texts, apiKey, embeddingModel);

    for (let j = 0; j < batch.length; j++) {
      embeddedChunks.push({ ...batch[j], embedding: embeddings[j] });
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, allChunks.length), allChunks.length);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < allChunks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return embeddedChunks;
}

/**
 * Retrieve top-k chunks by semantic (embedding) similarity
 * @param {string} query
 * @param {Array} embeddedChunks - Chunks with .embedding arrays
 * @param {string} apiKey
 * @param {string} embeddingModel
 * @param {number} topK
 * @returns {Promise<Array<{chunk, score, docName}>>}
 */
export async function retrieveSemantic(query, embeddedChunks, apiKey, embeddingModel, topK = 3) {
  if (!embeddedChunks || embeddedChunks.length === 0) return [];

  const [queryEmbedding] = await getEmbeddings([query], apiKey, embeddingModel);

  const scored = embeddedChunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    docName: chunk.docName
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
