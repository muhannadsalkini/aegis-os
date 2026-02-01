# 📚 Phase 3: RAG & Knowledgebases

> **Goal:** Build a Retrieval-Augmented Generation system to give your agents long-term memory

## 🎯 What You'll Learn

By the end of this phase, you'll understand:

1. **RAG (Retrieval-Augmented Generation)** — How to give LLMs access to custom knowledge
2. **Embeddings** — Converting text to vectors for semantic search
3. **Vector Databases** — Storing and searching embeddings efficiently
4. **Chunking Strategies** — Breaking documents into searchable pieces
5. **The RAG Pipeline** — From document upload to agent retrieval

---

## 📖 Core Concept: What is RAG?

### The Problem

LLMs have a **knowledge cutoff date**. They don't know:
- Information after their training
- Your company's internal docs
- Personal files on your computer
- Proprietary research or data

They also have **context limits**. You can't fit entire books into a single prompt.

### The Solution: RAG

**Retrieval-Augmented Generation** solves this by:

1. **Storing** your documents in a searchable database
2. **Retrieving** relevant chunks when the agent needs them
3. **Augmenting** the LLM's prompt with this context
4. **Generating** answers based on your specific knowledge

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Question: "What are our company's vacation policies?"     │
│                              ↓                                  │
│  1. EMBED THE QUESTION                                          │
│     Convert to vector: [0.23, -0.45, 0.67, ...]                │
│                              ↓                                  │
│  2. SEARCH VECTOR DATABASE                                      │
│     Find similar document chunks                                │
│                              ↓                                  │
│  3. RETRIEVE TOP RESULTS                                        │
│     • "HR Policy Doc, Page 12: Vacation accrual..."             │
│     • "Employee Handbook: Holiday schedule..."                  │
│                              ↓                                  │
│  4. AUGMENT PROMPT                                              │
│     System: "Use the following context to answer..."            │
│     Context: [retrieved chunks]                                 │
│     User: "What are our company's vacation policies?"           │
│                              ↓                                  │
│  5. GENERATE ANSWER                                             │
│     "According to the HR policy, employees accrue..."           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Understanding Embeddings

### What is an Embedding?

An embedding is a **vector (list of numbers)** that represents the semantic meaning of text.

```typescript
// Input text
"The cat sat on the mat"

// Embedding (simplified, real ones are 1536 dimensions)
[0.23, -0.45, 0.67, 0.12, -0.89, ...]
```

### Why Vectors?

Vectors let us measure **similarity** using math:

```
Text A: "How do I reset my password?"
Vector A: [0.2, 0.5, -0.3, ...]

Text B: "Password reset instructions"
Vector B: [0.21, 0.48, -0.28, ...]

Text C: "Pizza recipe"
Vector C: [-0.8, 0.1, 0.9, ...]

Similarity(A, B) = 0.95 ✅ Very similar!
Similarity(A, C) = 0.12 ❌ Not similar
```

### Creating Embeddings

We use OpenAI's `text-embedding-3-small` model:

```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'The quick brown fox jumps over the lazy dog',
});

const embedding = response.data[0].embedding; // [0.23, -0.45, ...]
```

---

## 🗄️ Vector Databases

### What is pgvector?

`pgvector` is a PostgreSQL extension that adds vector support. It lets us:

1. **Store** embeddings alongside our data
2. **Search** for similar vectors efficiently
3. **Index** vectors for fast lookup (HNSW algorithm)

### The Documents Table

```sql
create table documents (
  id bigserial primary key,
  content text,              -- The actual text chunk
  metadata jsonb,            -- File name, page number, etc.
  embedding vector(1536)     -- OpenAI embedding dimension
);
```

### Similarity Search

We use **cosine similarity** to find related chunks:

```sql
-- Find similar documents
SELECT 
  content,
  1 - (embedding <=> query_embedding) as similarity
FROM documents
WHERE 1 - (embedding <=> query_embedding) > 0.5
ORDER BY embedding <=> query_embedding
LIMIT 5;
```

The `<=>` operator is cosine distance (smaller = more similar).

---

## ✂️ Chunking Strategies

### Why Chunk?

Documents are too large to embed all at once. We break them into **chunks**:

- Small enough to be specific
- Large enough to be meaningful
- With some overlap to preserve context

### Chunking Methods

#### 1. Fixed Size
Split every N characters:
```
Chunk 1: Characters 0-1000
Chunk 2: Characters 1000-2000
```

❌ Problem: Might split mid-sentence

#### 2. Recursive Character Splitting (Our Approach)

Try to split on natural boundaries:
```
1. Try splitting on paragraphs (\n\n)
2. If still too large, split on sentences (\n)
3. If still too large, split on words ( )
4. If still too large, split on characters
```

✅ Benefit: Preserves semantic units

### Chunk Overlap

We add overlap to maintain context:

```
┌─────────────────────────┐
│  Chunk 1 (1000 chars)   │
│  "...and this is how    │
│   the system works..."  │
└───────────┬─────────────┘
            │ 200 char overlap
┌───────────▼─────────────┐
│  Chunk 2 (1000 chars)   │
│  "...the system works   │
│   by processing..."     │
└─────────────────────────┘
```

---

## 🔄 The RAG Pipeline

### 1. Document Ingestion

```typescript
// Parse document
const parseResult = await parseDocument(buffer, mimetype);

// Split into chunks
const chunks = await splitter.splitText(parseResult.text);

// Generate embeddings
const embeddings = await generateEmbeddings(chunks);

// Store in database
await vectorStore.addDocuments(chunks.map((chunk, i) => ({
  content: chunk,
  embedding: embeddings[i],
  metadata: { source: filename, chunk_index: i }
})));
```

### 2. Agent Retrieval

```typescript
// When agent needs knowledge
const queryEmbedding = await generateEmbeddings([userQuestion]);
const results = await vectorStore.similaritySearch(queryEmbedding[0]);

// Add to agent context
const context = results.map(r => r.content).join('\n\n');
const enhancedPrompt = `Use this information:\n${context}\n\nQuestion: ${userQuestion}`;
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/rag/parser.ts` | Parse PDF/TXT/MD files |
| `lib/rag/chunker.ts` | Split text into chunks |
| `lib/rag/embedder.ts` | Generate OpenAI embeddings |
| `lib/rag/store.ts` | Vector database operations |
| `routes/knowledge.route.ts` | Upload/search endpoints |
| `tools/knowledge/search.ts` | Agent tool for querying |

---

## 🧪 Try It Yourself!

### 1. Set Up Supabase

Run the migration in `docs/phase-3-rag/supabase_setup.sql`:

```sql
-- Enable pgvector
create extension if not exists vector;

-- Create documents table
create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536)
);
```

### 2. Update .env

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Upload a Document

```bash
curl -X POST http://localhost:3001/knowledge/upload \
  -F "file=@your-document.pdf"
```

### 4. Search Directly

```bash
curl -X POST http://localhost:3001/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main topic?"}'
```

### 5. Ask the Agent

```bash
curl -X POST http://localhost:3001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Search our knowledge base: What are the key findings?"
    }]
  }'
```

The agent now has the `search_knowledgebase` tool!

---

## 🎓 Key Takeaways

1. **RAG = Retrieval + Generation** — Find relevant info, then generate answers
2. **Embeddings capture meaning** — Similar text has similar vectors
3. **Vector search is fast** — pgvector uses HNSW indexing
4. **Chunking matters** — Too small = no context, too large = no precision
5. **Metadata helps** — Store source, page, date for better results

---

## 🔬 Advanced Topics

### Query Rewriting

Sometimes the user's question isn't optimal for search:

```typescript
// User: "Who's the CEO?"
// Better query: "Chief Executive Officer company leadership"

const rewrittenQuery = await llm.rewriteQuery(originalQuery);
const results = await search(rewrittenQuery);
```

### Hybrid Search

Combine semantic (vector) and keyword (full-text) search:

```sql
SELECT * FROM documents
WHERE 
  to_tsvector(content) @@ to_tsquery('postgres')  -- Keyword
  OR embedding <=> query_embedding < 0.5          -- Semantic
ORDER BY 
  ts_rank(to_tsvector(content), to_tsquery('postgres')) +
  (1 - (embedding <=> query_embedding))
LIMIT 5;
```

### Re-ranking

Get more results, then re-rank with a better model:

```typescript
const candidates = await search(query, limit: 20);
const reranked = await reranker.rank(query, candidates);
return reranked.slice(0, 5);
```

---

## 📝 Exercises

### Exercise 1: Experiment with Chunk Size
Try different chunk sizes (500, 1000, 2000 chars). Which works best for your documents?

### Exercise 2: Add Filters
Extend the search tool to filter by metadata:
```typescript
search({ query, source: "manual.pdf", date: "2024" })
```

### Exercise 3: Build a Citation System
Make the agent cite which document chunks it used in its answer.

---

## ⚠️ Common Pitfalls

1. **Forgetting to enable pgvector** → Migration fails
2. **Wrong embedding dimensions** → 1536 for text-embedding-3-small
3. **No chunk overlap** → Loss of context at boundaries
4. **Bad descriptions** → Agent doesn't know when to search
5. **Not cleaning text** → Newlines/formatting break search

---

## ➡️ Next Phase

Once you've mastered RAG, move on to:
**Phase 4: Agent Types** — Build specialized agents that collaborate!
