"""Web-first entrypoint for the RAG assistant."""

import argparse
import json
import shutil
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import config

try:
    from rich.console import Console
except ImportError:  # pragma: no cover - fallback for minimal environments
    class Console:  # type: ignore[override]
        def print(self, *args, **kwargs):
            print(*args)

        def input(self, prompt=""):
            return input(prompt)


console = Console()


def build_index(rebuild: bool):
    if rebuild and config.CHROMA_DB_DIR.exists():
        shutil.rmtree(config.CHROMA_DB_DIR)

    try:
        from ingest import load_and_chunk_documents
        from vector_store import MultiDocVectorStore
    except Exception as exc:  # pragma: no cover - depends on optional deps
        console.print(f"[yellow]Falling back to simple mode:[/yellow] {exc}")
        return None

    store = MultiDocVectorStore(config.CHROMA_DB_DIR, config.EMBEDDING_MODEL_NAME)
    if rebuild or not store.list_sources():
        console.print("[bold cyan]Indexing documents...[/bold cyan]")
        chunks = load_and_chunk_documents(
            config.DATA_DIR, config.CHUNK_SIZE, config.CHUNK_OVERLAP
        )
        if chunks:
            store.add_chunks(chunks)
    else:
        console.print("[dim]Using existing index. Pass --rebuild to re-index.[/dim]")
    return store


def build_chat_response(question: str, store):
    if not question or not str(question).strip():
        return {"status": "ok", "answer": "Please enter a question first."}

    if store is None:
        return {
            "status": "ok",
            "answer": (
                "The RAG index is not available yet, so this is a fallback response. "
                "Add documents to the data folder and install the required Python packages "
                "to enable full retrieval and comparison."
            ),
        }

    try:
        sources = store.list_sources()
        if not sources:
            return {
                "status": "ok",
                "answer": "No indexed documents are available yet. Add source files to the data folder and rebuild the index.",
            }

        retrieved = store.query_per_document(question, sources, config.TOP_K_PER_DOC)
        try:
            from compare import get_comparison

            answer = get_comparison(question, retrieved)
        except Exception as exc:  # pragma: no cover - depends on optional deps
            answer = (
                "The full LLM comparison flow is unavailable right now. "
                f"Falling back to retrieved context from {len(retrieved)} sources. "
                f"Details: {exc}"
            )
        return {"status": "ok", "answer": answer}
    except Exception as exc:  # pragma: no cover - defensive fallback
        return {"status": "ok", "answer": f"The retrieval pipeline failed: {exc}"}


class ChatRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path != "/":
            self._send_json(404, {"status": "error", "message": "Not found"})
            return

        html = """
        <!doctype html>
        <html lang=\"en\">
        <head>
          <meta charset=\"utf-8\">
          <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
          <title>Context-Aware RAG Chatbot</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 760px; margin: 2rem auto; padding: 1rem; line-height: 1.5; }
            textarea, input { width: 100%; padding: 0.75rem; margin-top: 0.5rem; border: 1px solid #ccc; border-radius: 6px; }
            button { margin-top: 0.75rem; padding: 0.7rem 1rem; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
            #output { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Context-Aware RAG Chatbot</h1>
          <p>Ask a question about the indexed documents and the assistant will respond from the local retrieval pipeline.</p>
          <textarea id=\"question\" rows=\"4\" placeholder=\"Ask a question about the documents...\"></textarea>
          <button onclick=\"sendQuestion()\">Ask</button>
          <div id=\"output\">Waiting for your question…</div>
          <script>
            async function sendQuestion() {
              const question = document.getElementById('question').value.trim();
              const output = document.getElementById('output');
              if (!question) {
                output.textContent = 'Please enter a question.';
                return;
              }
              output.textContent = 'Thinking...';
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
              });
              const data = await response.json();
              output.textContent = data.answer || 'No answer received.';
            }
          </script>
        </body>
        </html>
        """
        self._send_text(200, html, content_type="text/html; charset=utf-8")

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path != "/api/chat":
            self._send_json(404, {"status": "error", "message": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError:
            payload = {}

        response = build_chat_response(payload.get("question", ""), self.server.store)
        self._send_json(200, response)

    def _send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, status_code: int, body: str, content_type: str):
        encoded = body.encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, format, *args):
        return


class ChatHTTPServer(ThreadingHTTPServer):
    def __init__(self, server_address, handler, store):
        super().__init__(server_address, handler)
        self.store = store


def run_cli(store):
    while True:
        question = console.input("\nAsk a comparison question (or 'quit'): ")
        if question.strip().lower() in {"quit", "exit"}:
            break
        response = build_chat_response(question, store)
        console.print(response["answer"])


def run_server(host: str, port: int, store):
    server = ChatHTTPServer((host, port), ChatRequestHandler, store)
    console.print(f"[bold green]Serving on http://{host}:{port}[/bold green]")
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser(description="Run the local RAG chatbot")
    parser.add_argument("--rebuild", action="store_true", help="Re-index documents from scratch")
    parser.add_argument("--cli", action="store_true", help="Use the old terminal-based chat experience")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface for the web server")
    parser.add_argument("--port", type=int, default=8000, help="Port for the web server")
    args = parser.parse_args()

    store = build_index(args.rebuild)

    if args.cli:
        run_cli(store)
    else:
        run_server(args.host, args.port, store)


if __name__ == "__main__":
    main()
