/**
 * tfidf.js — TF-IDF based in-browser retrieval
 */
import { tokenize } from './chunker.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'this', 'that', 'these',
  'those', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'can', 'as', 'if', 'so', 'not', 'no', 'more', 'also', 'than'
]);

function filterStopWords(tokens) {
  return tokens.filter(t => !STOP_WORDS.has(t) && t.length > 2);
}

function computeTF(tokens) {
  const freq = {};
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }
  const total = tokens.length || 1;
  const tf = {};
  for (const token in freq) {
    tf[token] = freq[token] / total;
  }
  return tf;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  const keysA = Object.keys(vecA);
  for (const key of keysA) {
    const a = vecA[key];
    const b = vecB[key] || 0;
    dot += a * b;
    normA += a * a;
  }
  for (const key of Object.keys(vecB)) {
    normB += vecB[key] * vecB[key];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a TF-IDF index from all chunks across all documents
 * @param {Array<{id: string, name: string, chunks: Array}>} documents
 * @returns {Object} index with idf map and tfidf vectors per chunk
 */
export function buildTFIDFIndex(documents) {
  const allChunks = [];
  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      allChunks.push({ ...chunk, docId: doc.id, docName: doc.name });
    }
  }

  const N = allChunks.length;
  if (N === 0) return { chunks: [], vectors: [], idf: {} };

  // Compute term frequencies per chunk
  const tokensList = allChunks.map(c => filterStopWords(tokenize(c.text)));
  const tfs = tokensList.map(computeTF);

  // Build vocabulary and compute IDF
  const vocab = new Set(tfs.flatMap(tf => Object.keys(tf)));
  const idf = {};
  for (const term of vocab) {
    const df = tfs.filter(tf => term in tf).length;
    idf[term] = Math.log((N + 1) / (df + 1)) + 1; // smoothed IDF
  }

  // Build TF-IDF vectors
  const vectors = tfs.map(tf => {
    const vec = {};
    for (const term in tf) {
      vec[term] = tf[term] * (idf[term] || 0);
    }
    return vec;
  });

  return { chunks: allChunks, vectors, idf };
}

/**
 * Retrieve top-k chunks by TF-IDF cosine similarity
 * @param {string} query
 * @param {Object} index - Built TF-IDF index
 * @param {number} topK
 * @returns {Array<{chunk, score, docName}>}
 */
export function retrieveTFIDF(query, index, topK = 3) {
  const { chunks, vectors, idf } = index;
  if (!chunks || chunks.length === 0) return [];

  const queryTokens = filterStopWords(tokenize(query));
  const queryTF = computeTF(queryTokens);
  const queryVec = {};
  for (const term in queryTF) {
    queryVec[term] = queryTF[term] * (idf[term] || Math.log(2)); // small IDF for unseen terms
  }

  const scored = chunks.map((chunk, i) => ({
    chunk,
    score: cosineSimilarity(queryVec, vectors[i]),
    docName: chunk.docName
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
