# 📖 Phase 3 Glossary

## RAG Terms

**RAG (Retrieval-Augmented Generation)**
A technique that enhances LLM responses by retrieving relevant information from a knowledge base before generating an answer.

**Embedding**
A numerical vector representation of text that captures semantic meaning. Similar texts have similar embeddings.

**Vector**
A list of numbers (e.g., `[0.23, -0.45, 0.67, ...]`) used to represent data in n-dimensional space.

**Semantic Search**
Finding documents based on meaning/context rather than exact keyword matches.

**Chunking**
Breaking large documents into smaller pieces that can be individually embedded and retrieved.

**Chunk Overlap**
Repeating some content between adjacent chunks to preserve context across boundaries.

**Context Window**
The maximum amount of text an LLM can process in one request (e.g., 128K tokens for GPT-4).

## Vector Database Terms

**Vector Database**
A database optimized for storing and searching high-dimensional vectors (embeddings).

**pgvector**
A PostgreSQL extension that adds vector data types and similarity search capabilities.

**Cosine Similarity**
A measure of similarity between two vectors, ranging from -1 (opposite) to 1 (identical).

**Cosine Distance**
`1 - cosine_similarity`. Smaller distance means more similar. Used by pgvector's `<=>` operator.

**HNSW (Hierarchical Navigable Small World)**
An algorithm for fast approximate nearest neighbor search in high-dimensional spaces.

**Index**
A data structure that speeds up vector searches, like HNSW or IVFFlat.

## Embedding Terms

**Embedding Model**
An AI model that converts text to vectors (e.g., OpenAI's `text-embedding-3-small`).

**Embedding Dimension**
The length of the vector. `text-embedding-3-small` produces 1536-dimensional vectors.

**Query Embedding**
The vector representation of a user's search query.

**Document Embedding**
The vector representation of a document chunk in the knowledge base.

## Chunking Terms

**Recursive Character Splitting**
A chunking strategy that tries to split on natural boundaries (paragraphs, sentences, words) before resorting to character splits.

**Token**
The atomic unit of text for LLMs (roughly 3-4 characters in English).

**Separator**
A character or string used to split text (e.g., `\n\n` for paragraphs, `. ` for sentences).

## Search Terms

**Top-K Search**
Retrieving the K most similar results (e.g., top 5 chunks).

**Threshold**
A minimum similarity score required for a result to be included (e.g., only chunks with >0.5 similarity).

**Hybrid Search**
Combining multiple search methods (e.g., vector + keyword) for better results.

**Re-ranking**
Sorting search results using a more sophisticated model after initial retrieval.

**Query Rewriting**
Transforming a user's query to make it more effective for search.

## Metadata Terms

**Metadata**
Additional information about a document chunk (e.g., source file, page number, date).

**JSONB**
PostgreSQL's efficient binary JSON data type, used for storing flexible metadata.

**Filter**
Narrowing search results based on metadata (e.g., only documents from 2024).

## Pipeline Terms

**Ingestion Pipeline**
The process of uploading, parsing, chunking, embedding, and storing documents.

**Retrieval Pipeline**
The process of embedding a query, searching, and returning relevant chunks.

**Document Parser**
Code that extracts text from various file formats (PDF, DOCX, etc.).

## Performance Terms

**Batch Processing**
Processing multiple items together for efficiency (e.g., embedding 10 chunks at once).

**Caching**
Storing computed results (like embeddings) to avoid recalculation.

**Rate Limiting**
Restricting API calls to avoid hitting usage limits or incurring high costs.
