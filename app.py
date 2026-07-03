"""
app.py
------
Command-line entry point that ties everything together:

    1. Ingest + chunk documents from data/
    2. Embed and store chunks in Chroma (skipped if already indexed)
    3. Loop: take a question, retrieve per-document, ask the LLM to compare
    4. Print a nicely formatted answer

Run with:
    python src/app.py --rebuild      # re-index documents from scratch
    python src/app.py                # reuse existing index
"""

import argparse
import shutil

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel

import config
from ingest import load_and_chunk_documents
from vector_store import MultiDocVectorStore
from compare import get_comparison

console = Console()


def build_index(rebuild: bool) -> MultiDocVectorStore:
    if rebuild and config.CHROMA_DB_DIR.exists():
        shutil.rmtree(config.CHROMA_DB_DIR)

    store = MultiDocVectorStore(config.CHROMA_DB_DIR, config.EMBEDDING_MODEL_NAME)

    if rebuild or not store.list_sources():
        console.print("[bold cyan]Indexing documents...[/bold cyan]")
        chunks = load_and_chunk_documents(
            config.DATA_DIR, config.CHUNK_SIZE, config.CHUNK_OVERLAP
        )
        store.add_chunks(chunks)
    else:
        console.print("[dim]Using existing index. Pass --rebuild to re-index.[/dim]")

    return store


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild", action="store_true", help="Re-index documents from scratch")
    args = parser.parse_args()

    store = build_index(args.rebuild)
    sources = store.list_sources()

    if len(sources) < 2:
        console.print(
            "[bold red]Warning:[/bold red] fewer than 2 documents indexed. "
            "Add more files to data/ to make comparisons meaningful."
        )

    console.print(Panel(f"Indexed documents: {', '.join(sources)}", title="Multi-Doc RAG"))

    while True:
        question = console.input("\n[bold green]Ask a comparison question[/bold green] (or 'quit'): ")
        if question.strip().lower() in ("quit", "exit"):
            break

        retrieved = store.query_per_document(question, sources, config.TOP_K_PER_DOC)
        answer = get_comparison(question, retrieved)

        console.print(Markdown(answer))


if __name__ == "__main__":
    main()
