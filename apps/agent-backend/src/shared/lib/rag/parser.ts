

/**
 * Result of parsing a document
 */
export interface ParseResult {
  text: string;
  metadata: Record<string, any>;
}

/**
 * Parses a file buffer based on its mimetype/extension
 */
export async function parseDocument(buffer: Buffer, mimetype: string): Promise<ParseResult> {
  // Normalize mimetype
  const type = mimetype.toLowerCase();

  if (type === 'application/pdf') {
    return parsePdf(buffer);
  } else if (type === 'text/plain' || type === 'text/markdown' || type === 'application/json') {
    return parseText(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimetype}`);
  }
}

/**
 * Parse PDF files using pdf-parse
 */
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Use createRequire to load CommonJS module in ESM context
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  
  // pdf-parse v1.x exports a simple default function
  const pdf = require('pdf-parse');
  
  const data = await pdf(buffer);
  
  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      info: data.info,
    }
  };
}

/**
 * Parse plain text files
 */
async function parseText(buffer: Buffer): Promise<ParseResult> {
  const text = buffer.toString('utf-8');
  
  return {
    text,
    metadata: {
      length: text.length,
    }
  };
}
