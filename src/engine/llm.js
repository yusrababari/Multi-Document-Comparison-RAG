/**
 * llm.js — OpenRouter LLM API with streaming support
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const SYSTEM_PROMPT = `You are yusrababari, a precise, context-aware knowledge assistant. Your job is to answer questions based ONLY on the provided document context.

Rules:
- Answer ONLY from the provided context. Do not use prior knowledge.
- If the answer is not in the context, say: "I couldn't find information about that in the uploaded documents."
- Be concise and accurate. Cite which document or section your answer comes from when helpful.
- Format your answers with markdown when appropriate (bullet points, bold terms, code blocks, etc.)
- Be conversational but precise.`;

/**
 * Build the RAG prompt with retrieved context
 */
export function buildRAGPrompt(query, retrievedChunks) {
  if (retrievedChunks.length === 0) {
    return `No documents have been uploaded yet. Please add documents to the knowledge base first.\n\nUser question: ${query}`;
  }

  const contextBlocks = retrievedChunks.map((result, i) => {
    const score = Math.round(result.score * 100);
    return `[Context ${i + 1}] (Source: "${result.docName}", relevance: ${score}%)\n${result.chunk.text}`;
  });

  return `Here is the relevant context from the knowledge base:\n\n${contextBlocks.join('\n\n---\n\n')}\n\nUser question: ${query}`;
}

/**
 * Stream a chat completion from OpenRouter
 * @param {Array} messages - Chat history including the current query
 * @param {string} apiKey
 * @param {string} model
 * @param {Function} onChunk - Called with each text chunk as it streams
 * @param {Function} onDone - Called when streaming is complete
 * @param {AbortSignal} signal - AbortController signal for cancellation
 */
export async function streamChat(messages, apiKey, model, onChunk, onDone, signal) {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yusrababari.app',
      'X-Title': 'yusrababari Knowledge Assistant'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 1500
    }),
    signal
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') {
        if (onDone) onDone(fullContent);
        return;
      }
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          if (onChunk) onChunk(delta, fullContent);
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }

  if (onDone) onDone(fullContent);
}

export const CHAT_MODELS = [
  { value: 'openai/gpt-4o', label: 'GPT-4o', desc: 'Most capable OpenAI model' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast & affordable' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', desc: 'Excellent reasoning' },
  { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku', desc: 'Fast Anthropic model' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5', desc: 'Fast Google model' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', desc: 'Open source powerhouse' },
  { value: 'mistralai/mixtral-8x7b-instruct', label: 'Mixtral 8x7B', desc: 'Efficient MoE model' }
];

export const EMBEDDING_MODELS = [
  { value: 'openai/text-embedding-3-small', label: 'text-embedding-3-small', desc: 'Efficient & accurate' },
  { value: 'openai/text-embedding-ada-002', label: 'text-embedding-ada-002', desc: 'Classic OpenAI embedding' }
];
