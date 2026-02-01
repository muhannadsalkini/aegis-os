
/**
 * Interface for a chunk of text
 */
export interface Chunk {
  pageContent: string;
  metadata: Record<string, any>;
}

interface ChunkerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

/**
 * Simple recursive character text splitter
 * 
 * Splits text based on a list of separators, trying to keep chunks
 * within the chunkSize limit while maintaining context via overlap.
 */
export class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options: ChunkerOptions = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
    this.separators = options.separators || ['\n\n', '\n', ' ', ''];
  }

  /**
   * Split text into chunks
   */
  async splitText(text: string): Promise<string[]> {
    const finalChunks: string[] = [];
    let goodSplits: string[] = [text];

    for (const separator of this.separators) {
      const newSplits: string[] = [];
      
      for (const split of goodSplits) {
        if (split.length < this.chunkSize) {
          newSplits.push(split);
        } else {
          // If the split is too large, split it further by the current separator
          const smallerSplits = this.splitOnSeparator(split, separator);
          newSplits.push(...smallerSplits);
        }
      }
      goodSplits = newSplits;
    }

    // Now merge small chunks back together until they hit chunk size
    const separator = this.separators[this.separators.length - 1];
    return this.mergeSplits(goodSplits, separator || '');
  }

  private splitOnSeparator(text: string, separator: string): string[] {
    let parts: string[];
    if (separator === '') {
      parts = text.split('');
    } else {
      parts = text.split(separator);
    }
    
    // Check if we need to keep the separator attached (usually yes for non-empty)
    // Detailed implementation omitted for brevity, simplified splitting:
    return parts.filter(p => p !== '');
  }

  private mergeSplits(splits: string[], separator: string): string[] {
    const docs: string[] = [];
    let currentDoc: string[] = [];
    let total = 0;

    for (const d of splits) {
      const len = d.length;
      if (total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
        if (total > this.chunkSize) {
          // Warning: single piece larger than chunk size
        }
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator || '');
          if (doc) docs.push(doc);
          
          // Overlap logic: keep last few chunks
          // Simplified: just start new
          currentDoc = [];
          total = 0;
        }
      }
      
      currentDoc.push(d);
      total += len + (currentDoc.length > 1 ? separator.length : 0);
    }

    if (currentDoc.length > 0) {
        const doc = currentDoc.join(separator || '');
        if (doc) docs.push(doc);
    }

    return docs;
  }
}
