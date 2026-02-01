
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseDocument } from '../lib/rag/parser.js';
import { RecursiveCharacterTextSplitter } from '../lib/rag/chunker.js';
import { generateEmbeddings } from '../lib/rag/embedder.js';
import { VectorStore } from '../lib/rag/store.js';

export async function knowledgeRoutes(fastify: FastifyInstance) {
  
  /**
   * POST /knowledge/upload
   * Upload a document to the knowledge base
   */
  fastify.post('/knowledge/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'No file uploaded',
        });
      }

      console.log(`\n📄 Processing upload: ${data.filename} (${data.mimetype})`);

      // 1. Parse Document
      const buffer = await data.toBuffer();
      const parseResult = await parseDocument(buffer, data.mimetype);
      console.log(`   Parsed ${parseResult.text.length} characters`);

      // 2. Chunk Text
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const textChunks = await splitter.splitText(parseResult.text);
      console.log(`   Split into ${textChunks.length} chunks`);

      // 3. Generate Embeddings
      // Note: In production, batch this if too many chunks
      console.log(`   Generating embeddings...`);
      const embeddings = await generateEmbeddings(textChunks);

      // 4. Store in Vector Database
      console.log(`   Storing in Supabase...`);
      const store = new VectorStore();
      
      const docs = textChunks.map((chunk, i) => ({
        content: chunk,
        metadata: {
          ...parseResult.metadata,
          source: data.filename,
          chunk_index: i,
        },
        embedding: embeddings[i] || [],
      }));
      
      await store.addDocuments(docs);
      
      console.log(`✅ Upload complete!`);

      return reply.send({
        success: true,
        data: {
          filename: data.filename,
          chunks: textChunks.length,
          metadata: parseResult.metadata,
        },
      });

    } catch (error) {
      console.error('❌ Upload error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /knowledge/search
   * Test search endpoint
   */
   fastify.post('/knowledge/search', async (request: FastifyRequest<{ Body: { query: string } }>, reply: FastifyReply) => {
    try {
      const { query } = request.body || {};
      
      if (!query) {
        return reply.status(400).send({ error: 'Query required' });
      }

      const embeddings = await generateEmbeddings([query]);
      
      if (!embeddings || embeddings.length === 0 || !embeddings[0]) {
        return reply.status(500).send({ success: false, error: 'Failed to generate embedding' });
      }

      console.log(`\n🔍 Searching for: "${query}"`);
      console.log(`   Embedding dimensions: ${embeddings[0].length}`);

      const store = new VectorStore();
      // Use 0.2 threshold - returns results with >20% similarity
      const results = await store.similaritySearch(embeddings[0], 5, 0.2);

      console.log(`   Found ${results.length} results`);
      if (results.length > 0) {
        console.log(`   Top result similarity: ${results[0]?.similarity.toFixed(3)}`);
        console.log(`   All similarities:`, results.map(r => r.similarity.toFixed(3)));
      }

      return reply.send({
        success: true,
        data: results
      });

    } catch (error) {
       console.error('❌ Search error:', error);
       return reply.status(500).send({ success: false, error: 'Search failed' });
    }
   });

   /**
    * GET /knowledge/list
    * Debug endpoint to list all documents
    */
   fastify.get('/knowledge/list', async (request: FastifyRequest, reply: FastifyReply) => {
     try {
       const store = new VectorStore();
       // Access the private client via bracket notation for debugging
       const client = (store as any).client;
       
       const { data, error } = await client
         .from('documents')
         .select('id, content, metadata')
         .limit(10);

       if (error) {
         return reply.status(500).send({ success: false, error: error.message });
       }

       return reply.send({
         success: true,
         count: data?.length || 0,
         data: data
       });
     } catch (error) {
       console.error('❌ List error:', error);
       return reply.status(500).send({ success: false, error: 'List failed' });
     }
   });
}
