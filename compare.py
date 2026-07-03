"""
compare.py
----------
Builds a structured, source-attributed prompt from the per-document
retrieval results and calls the LLM to produce a comparison.

The prompt design is the single most important part of a multi-document
RAG system. Two rules make it work well:

1. Keep chunks grouped and clearly labeled by source. Never interleave
   chunks from different documents without labels -- the model needs
   to know "this paragraph is from Paper A" to compare correctly.
2. Explicitly instruct the model to cite which document each claim comes
   from. This both improves faithfulness and makes answers verifiable.
"""

import anthropic
import config


def build_comparison_prompt(question: str, retrieved: dict[str, list[str]]) -> str:
    sections = []
    for source, chunks in retrieved.items():
        if not chunks:
            continue
        joined = "\n\n".join(f"[Excerpt {i+1}] {c}" for i, c in enumerate(chunks))
        sections.append(f"=== SOURCE: {source} ===\n{joined}")

    context_block = "\n\n".join(sections)

    prompt = f"""You are comparing multiple source documents to answer a question.

Below are excerpts retrieved from each document. Excerpts from the same
document are grouped under a "SOURCE:" header.

{context_block}

QUESTION: {question}

Instructions:
- Answer using ONLY the excerpts above. If the excerpts don't contain
  enough information to fully answer, say so explicitly.
- Structure your answer by clearly stating what each source says before
  drawing comparisons, e.g. "Paper A approaches this by... Paper B, in
  contrast, ..."
- End with a short synthesis: where do the sources agree, and where do
  they genuinely differ?
- Every claim should be traceable to a specific source. Reference the
  source name when making a claim (e.g. "According to paper_a.pdf...").
"""
    return prompt


def get_comparison(question: str, retrieved: dict[str, list[str]]) -> str:
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    prompt = build_comparison_prompt(question, retrieved)

    response = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=config.MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
