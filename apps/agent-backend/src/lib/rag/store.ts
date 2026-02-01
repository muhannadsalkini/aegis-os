
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

/**
 * Interface for a stored document chunk
 */
export interface DocumentChunk {
  id?: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}

/**
 * Result of a similarity search
 */
export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class VectorStore {
  private client: SupabaseClient;
  private tableName: string;

  constructor(tableName: string = 'documents') {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    this.tableName = tableName;
  }

  /**
   * Add documents to the store
   */
  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .insert(chunks);

    if (error) {
      throw new Error(`Error inserting documents: ${error.message}`);
    }
  }

  /**
   * Search for similar documents
   * Requires a postgres function `match_documents` to be defined in Supabase
   */
  async similaritySearch(queryEmbedding: number[], limit: number = 5, matchThreshold: number = 0.2): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: limit,
    });

    if (error) {
      throw new Error(`Error searching documents: ${error.message}`);
    }

    return data.map((item: any) => ({
      id: item.id,
      content: item.content,
      metadata: item.metadata,
      similarity: item.similarity,
    }));
  }
}
