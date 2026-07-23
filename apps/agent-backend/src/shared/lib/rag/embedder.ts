
import OpenAI from 'openai';
import { env } from '../../../core/config/env.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for a list of text chunks
 * Uses text-embedding-3-small which is efficient and high quality
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // OpenAI has a limit on inputs per request, usually 2048
  // For safety, we process in batches if needed, but for now assuming simple usage
  
  if (texts.length === 0) return [];

  // Cleanup texts: collapse line breaks into spaces so multi-line chunks
  // embed as a single continuous passage.
  const cleanTexts = texts.map(t => t.replace(/\r?\n/, ' ').trim());


  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanTexts,
      encoding_format: 'float',
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}
