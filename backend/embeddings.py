import os
import chromadb
from chromadb.config import Settings
from langchain_ollama.embeddings import OllamaEmbeddings


CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_data")
COLLECTION_NAME = "resume_embeddings"

_client = None
_collection = None


def get_embeddings() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model="nomic-embed-text",
        base_url="http://localhost:11434",
    )


def get_chroma_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=CHROMA_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_collection():
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection
