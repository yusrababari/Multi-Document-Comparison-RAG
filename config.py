"""
config.py file
---------
Central place for all the knobs you'll want to tune while experimenting.
Keeping these in one file makes it easy to run controlled experiments,
e.g. "does CHUNK_SIZE=500 retrieve better than CHUNK_SIZE=1000?"
"""

import os
from pathlib import Path

# --- Paths -------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CHROMA_DB_DIR = PROJECT_ROOT / "chroma_db"

# --- Chunking ------------------------------------------------------------
# Smaller chunks -> more precise retrieval but less context per chunk.
# Larger chunks -> more context but retrieval gets noisier.
CHUNK_SIZE = 800          # characters per chunk
CHUNK_OVERLAP = 150       # overlap between consecutive chunks

# --- Embeddings ----------------------------------------------------------
# Runs fully locally, no API key needed. Swap for "all-mpnet-base-v2" for
# higher quality at the cost of speed, or an OpenAI/Voyage embedding model
# if you want to compare local vs. hosted embeddings.
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# --- Retrieval -----------------------------------------------------------
# Number of chunks retrieved PER DOCUMENT, not in total. If you compare
# 3 papers with TOP_K_PER_DOC=4, the LLM will see up to 12 chunks.
TOP_K_PER_DOC = 4

# --- LLM (generation) ------------------------------------------------------
ANTHROPIC_MODEL = "claude-sonnet-4-6"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MAX_TOKENS = 2000
