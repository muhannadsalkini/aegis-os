
import { Tool } from '../../types/tool.js';
import { generateEmbeddings } from '../../lib/rag/embedder.js';
import { VectorStore } from '../../lib/rag/store.js';

export const searchKnowledgebaseTool: Tool = {
  name: 'search_knowledgebase',
  description: 'Search the internal knowledge base for information. Use this when asked about Aegis OS specific details or uploaded documents.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find relevant information',
      },
    },
    required: ['query'],
  },
  execute: async (args: Record<string, unknown>) => {
    try {
      const query = args.query as string;
      console.log(`\n🔍 Searching knowledge base for: "${query}"`);
      
      // 1. Generate embedding for query
      const embeddings = await generateEmbeddings([query]);
      
      if (!embeddings || !embeddings[0]) {
        return { success: false, error: 'Failed to generate search embedding.', result: 'Error: Failed to generate search embedding.' };
      }
      
      // 2. Search vector store
      const store = new VectorStore();
      const results = await store.similaritySearch(embeddings[0], 3); // Get top 3 results
      
      if (results.length === 0) {
        return { success: true, result: 'No relevant information found in the knowledge base.' };
      }
      
      // 3. Format results
      const formattedResults = results.map((r, i) => {
        return `[Result ${i + 1}] (Source: ${r.metadata.source || 'Unknown'})\n${r.content}`;
      }).join('\n\n');
      
      return { 
        success: true, 
        result: `Found the following relevant information:\n\n${formattedResults}` 
      };
      
    } catch (error) {
      console.error('Search tool error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        result: `Error searching knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
};
