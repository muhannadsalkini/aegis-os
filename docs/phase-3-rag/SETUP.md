# 🔧 Supabase Setup Guide

This guide will walk you through setting up Supabase for the Aegis OS knowledge base.

---

## Step 1: Create a Supabase Project

### 1.1 Sign Up / Log In

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"**
3. Sign up with GitHub, Google, or email

### 1.2 Create a New Project

1. Click **"New Project"** in your dashboard
2. Fill in the details:
   - **Name**: `aegis-os-knowledge` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest to you
   - **Pricing Plan**: Free tier is fine for learning
3. Click **"Create new project"**
4. Wait 2-3 minutes for provisioning

---

## Step 2: Enable pgvector Extension

### 2.1 Open SQL Editor

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 2.2 Run the Migration

Copy and paste the following SQL and click **"Run"**:

```sql
-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(1536) -- OpenAI embeddings are 1536 dimensions
);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an index for faster vector searches (optional but recommended)
create index if not exists documents_embedding_idx 
  on documents 
  using hnsw (embedding vector_cosine_ops);
```

### 2.3 Verify

After running, you should see:
- ✅ `extension "vector" already exists, skipping`
- ✅ `CREATE TABLE`
- ✅ `CREATE FUNCTION`
- ✅ `CREATE INDEX`

---

## Step 3: Get Your Credentials

### 3.1 Find Your Project URL

1. Go to **Settings** → **API** in the left sidebar
2. Under **"Project URL"**, copy the URL
   - It looks like: `https://abcdefghijk.supabase.co`
3. This is your `SUPABASE_URL`

### 3.2 Get Your Service Role Key

1. Still in **Settings** → **API**
2. Scroll down to **"Project API keys"**
3. Find the **`service_role`** key (NOT the `anon` key!)
4. Click **"Reveal"** and copy it
5. This is your `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **IMPORTANT**: The service role key bypasses Row Level Security. Never expose it in client-side code or commit it to git!

---

## Step 4: Update Your .env File

### 4.1 Navigate to Your Backend

```bash
cd apps/agent-backend
```

### 4.2 Edit .env

Open `.env` in your editor and add:

```bash
# Supabase Configuration
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

Replace:
- `YOUR-PROJECT` with your actual project URL
- The key with your actual service role key

### 4.3 Verify Your .env

Your complete `.env` should look like:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-proj-...

# Server Configuration
PORT=3001
NODE_ENV=development

# Model Configuration
OPENAI_MODEL=gpt-4o-mini

# Supabase Configuration
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Step 5: Test the Connection

### 5.1 Restart Your Backend

```bash
pnpm dev
```

You should see:
```
✅ Tool Registry initialized with 9 tools:
   • calculator
   • get_current_time
   • web_search
   • http_fetch
   • get_weather
   • read_file
   • write_file
   • list_directory
   • search_knowledgebase

🤖 Created agent: Aegis Assistant (conversational)

╔═══════════════════════════════════════════════════════════════╗
║   🛡️  AEGIS OS - Agent Backend                                ║
║   Server running at: http://localhost:3001                    ║
╚═══════════════════════════════════════════════════════════════╝
```

If you see errors about Supabase, double-check your credentials!

### 5.2 Upload a Test Document

Create a simple test file:

```bash
echo "This is a test document about AI agents." > test.txt
```

Upload it:

```bash
curl -X POST http://localhost:3001/knowledge/upload \
  -F "file=@test.txt"
```

You should see:
```json
{
  "success": true,
  "data": {
    "filename": "test.txt",
    "chunks": 1,
    "metadata": { "length": 42 }
  }
}
```

### 5.3 Search It

```bash
curl -X POST http://localhost:3001/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is this about?"}'
```

You should get back your document!

---

## Step 6: Use the Web UI

### 6.1 Start the Frontend

```bash
cd ../web
pnpm dev
```

### 6.2 Open Knowledge Page

1. Navigate to `http://localhost:3000/knowledge`
2. Drag and drop a PDF, TXT, or MD file
3. Watch it process and index!
4. Try the semantic search playground

---

## Troubleshooting

### Error: "Invalid environment variables"

✅ Make sure both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`

### Error: "relation 'documents' does not exist"

✅ You didn't run the SQL migration. Go back to Step 2.

### Error: "function match_documents does not exist"

✅ The SQL function wasn't created. Run the full migration from Step 2 again.

### Error: "type 'vector' does not exist"

✅ The pgvector extension wasn't enabled. Run:
```sql
create extension vector;
```

### Connection timeout

✅ Check your `SUPABASE_URL` - make sure it's correct and includes `https://`

### Unauthorized error

✅ You're using the wrong key. Use the `service_role` key, NOT the `anon` key.

---

## Optional: View Your Data

### Using Supabase Table Editor

1. Go to **"Table Editor"** in Supabase dashboard
2. Select **"documents"** table
3. You'll see all your uploaded chunks with embeddings!

### Using SQL

```sql
-- View all documents
SELECT id, left(content, 50) as preview, metadata
FROM documents
LIMIT 10;

-- Count total chunks
SELECT count(*) FROM documents;

-- See unique sources
SELECT DISTINCT metadata->>'source' as source
FROM documents;
```

---

## Security Note

🔒 **Never commit your `.env` file to git!**

The `.gitignore` already includes it, but double-check:

```bash
# Make sure .env is listed
cat .gitignore | grep .env
```

If you accidentally commit it, immediately:
1. Revoke your Supabase keys in the dashboard
2. Generate new ones
3. Update your `.env`

---

## Next Steps

Now that Supabase is configured:

1. ✅ Upload some real documents (PDFs, markdown files)
2. ✅ Test the `search_knowledgebase` tool with your agent
3. ✅ Try the web UI at `http://localhost:3000/knowledge`
4. ✅ Study how the RAG pipeline works in `docs/phase-3-rag/README.md`

Happy building! 🚀
