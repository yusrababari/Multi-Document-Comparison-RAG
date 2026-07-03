"""
vector_store.py
----------------
Wraps ChromaDB so the rest of the app doesn't need to know about
embedding models or Chroma's API directly.

Design choice: we use ONE Chroma collection for all documents (not one
collection per document), and rely on metadata filtering (`where={"source": ...}`)
to retrieve per-document results. This is simpler to maintain and scales
to any number of documents without changing code.
"""

import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path

from ingest import Chunk


class MultiDocVectorStore:
    def __init__(self, persist_dir: Path, embedding_model_name: str):
        self.client = chromadb.PersistentClient(path=str(persist_dir))
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embedding_model_name
        )
        self.collection = self.client.get_or_create_collection(
            name="documents",
            embedding_function=self.embedding_fn,
        )

    def add_chunks(self, chunks: list[Chunk]) -> None:
        """Embed and store chunks. Chroma handles the embedding call for us
        via the embedding_function configured on the collection."""
        if not chunks:
            return
        self.collection.add(
            ids=[c.chunk_id for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[{"source": c.source} for c in chunks],
        )

    def list_sources(self) -> list[str]:
        """Return the distinct document names currently stored."""
        result = self.collection.get(include=["metadatas"])
        return sorted({m["source"] for m in result["metadatas"]})

    def query_per_document(self, query: str, sources: list[str], top_k: int) -> dict[str, list[str]]:
        """
        The core of multi-document RAG: run the SAME query against EACH
        source document independently (using a metadata filter), so every
        document gets a fair chance to contribute chunks -- instead of one
        document dominating the top-k because it happens to be larger or
        more textually similar to the query.
        """
        results: dict[str, list[str]] = {}
        for source in sources:
            res = self.collection.query(
                query_texts=[query],
                n_results=top_k,
                where={"source": source},
            )
            results[source] = res["documents"][0] if res["documents"] else []
        return results
