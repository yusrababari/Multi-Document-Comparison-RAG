"""
ingest.py
---------
Loads raw documents (PDF or .txt) and splits them into overlapping chunks.

The key design decision for MULTI-document comparison (as opposed to
single-document RAG) is that every chunk is tagged with a `source`
field in its metadata. Without this tag, once chunks are embedded and
stored, you lose the ability to say "give me only the chunks that came
from Paper A" -- which is exactly what the comparison step needs.
"""

from pathlib import Path
from dataclasses import dataclass
from pypdf import PdfReader


@dataclass
class Chunk:
    text: str
    source: str       # e.g. "paper_a.pdf" -- this is what enables comparison
    chunk_id: str      # unique id: f"{source}::{index}"


def load_text(file_path: Path) -> str:
    """Load raw text from a .pdf or .txt file."""
    if file_path.suffix.lower() == ".pdf":
        reader = PdfReader(str(file_path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif file_path.suffix.lower() in (".txt", ".md"):
        return file_path.read_text(encoding="utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file type: {file_path.suffix}")


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Simple fixed-size sliding-window chunker.

    This is intentionally the simplest possible strategy so the project
    is easy to reason about. A good "level up" exercise is to swap this
    for a semantic chunker (split on paragraph/sentence boundaries using
    embeddings similarity) and compare retrieval quality.
    """
    text = " ".join(text.split())  # collapse whitespace
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c for c in chunks if c.strip()]


def load_and_chunk_documents(data_dir: Path, chunk_size: int, overlap: int) -> list[Chunk]:
    """
    Walk a directory of source documents and return a flat list of
    Chunk objects, each tagged with which document it came from.
    """
    all_chunks: list[Chunk] = []
    files = sorted(list(data_dir.glob("*.pdf")) + list(data_dir.glob("*.txt")))

    if not files:
        raise FileNotFoundError(
            f"No .pdf or .txt files found in {data_dir}. "
            "Add the documents you want to compare there first."
        )

    for file_path in files:
        raw_text = load_text(file_path)
        pieces = chunk_text(raw_text, chunk_size, overlap)
        for i, piece in enumerate(pieces):
            all_chunks.append(
                Chunk(text=piece, source=file_path.name, chunk_id=f"{file_path.name}::{i}")
            )
        print(f"  {file_path.name}: {len(pieces)} chunks")

    return all_chunks
