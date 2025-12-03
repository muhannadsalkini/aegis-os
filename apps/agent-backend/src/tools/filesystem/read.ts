/**
 * ==========================================
 * 📄 File Read Tool
 * ==========================================
 * 
 * LEARNING NOTE: Safe File System Access
 * 
 * Giving an AI access to your file system is powerful but risky.
 * This tool demonstrates:
 * 
 * 1. SANDBOXING - Only allow access to specific directories
 * 2. VALIDATION - Check paths for traversal attacks
 * 3. SIZE LIMITS - Don't read huge files into memory
 * 4. BLOCKING - Prevent access to sensitive files
 * 
 * The AI can now read files you specify, but safely!
 */

import fs from 'fs/promises';
import path from 'path';
import type { Tool, ToolResult } from '../../types/tool.js';
import { validateFilePath } from '../../utils/validation.js';

/**
 * Maximum file size to read (1MB)
 */
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Allowed base directory for file operations
 * In production, make this configurable
 */
const WORKSPACE_DIR = './workspace';

/**
 * File Read Tool Definition
 */
export const readFileTool: Tool = {
  name: 'read_file',
  
  description: `Read the contents of a file from the workspace directory. Use this tool when:
- The user asks to read or view a file
- You need to examine file contents
- You need to analyze code or text

Limitations:
- Only files in the workspace directory can be read
- Maximum file size: 1MB
- Sensitive files (.env, credentials) are blocked

Provide the file path relative to the workspace directory.`,
  
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path relative to workspace (e.g., "notes.txt", "data/config.json")',
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)',
        enum: ['utf-8', 'ascii', 'base64'],
      },
    },
    required: ['path'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const filePath = args.path as string;
      const encoding = (args.encoding as BufferEncoding) || 'utf-8';
      
      // Validate the path
      const validation = validateFilePath(filePath, WORKSPACE_DIR);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const safePath = validation.sanitized!;
      console.log(`📄 Read File: ${safePath}`);
      
      // Check if file exists
      try {
        const stats = await fs.stat(safePath);
        
        if (stats.isDirectory()) {
          return { success: false, error: 'Path is a directory, not a file' };
        }
        
        if (stats.size > MAX_FILE_SIZE) {
          return {
            success: false,
            error: `File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})`,
          };
        }
      } catch {
        return { success: false, error: `File not found: ${filePath}` };
      }
      
      // Read the file
      const content = await fs.readFile(safePath, encoding);
      
      // Get file info
      const ext = path.extname(safePath).toLowerCase();
      const fileName = path.basename(safePath);
      
      console.log(`   Read ${content.length} characters from ${fileName}`);
      
      return {
        success: true,
        result: {
          path: filePath,
          fileName,
          extension: ext,
          content,
          size: content.length,
          encoding,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  },
};

