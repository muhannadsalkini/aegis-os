/**
 * ==========================================
 * ✏️ File Write Tool
 * ==========================================
 * 
 * LEARNING NOTE: Safe File Writing
 * 
 * Writing files is even more sensitive than reading!
 * This tool demonstrates:
 * 
 * 1. SANDBOXING - Only write to workspace directory
 * 2. SIZE LIMITS - Don't write huge files
 * 3. BACKUP - Option to backup before overwriting
 * 4. VALIDATION - Strict path checking
 * 
 * The AI can now create and modify files, but safely!
 */

import fs from 'fs/promises';
import path from 'path';
import type { Tool, ToolResult } from '../../types/tool.js';
import { validateFilePath } from '../../utils/validation.js';

/**
 * Maximum content size to write (500KB)
 */
const MAX_CONTENT_SIZE = 500 * 1024;

/**
 * Allowed base directory for file operations
 */
const WORKSPACE_DIR = './workspace';

/**
 * File Write Tool Definition
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  
  description: `Write content to a file in the workspace directory. Use this tool when:
- The user asks to create a new file
- You need to save output or results
- You need to update a file's contents

Limitations:
- Only files in the workspace directory can be written
- Maximum content size: 500KB
- Cannot write to sensitive locations

Provide the file path relative to the workspace directory.
If the file exists, it will be overwritten (unless append mode is used).`,
  
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File path relative to workspace (e.g., "output.txt", "data/result.json")',
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
      },
      append: {
        type: 'string',
        description: 'If "true", append to existing file instead of overwriting',
      },
    },
    required: ['path', 'content'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const filePath = args.path as string;
      const content = args.content as string;
      const append = args.append === 'true' || args.append === true;
      
      // Validate content size
      if (content.length > MAX_CONTENT_SIZE) {
        return {
          success: false,
          error: `Content too large: ${content.length} bytes (max: ${MAX_CONTENT_SIZE})`,
        };
      }
      
      // Validate the path
      const validation = validateFilePath(filePath, WORKSPACE_DIR);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const safePath = validation.sanitized!;
      console.log(`✏️ Write File: ${safePath} (${append ? 'append' : 'overwrite'})`);
      
      // Ensure the directory exists
      const dir = path.dirname(safePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Check if file exists
      let existed = false;
      let previousSize = 0;
      try {
        const stats = await fs.stat(safePath);
        existed = true;
        previousSize = stats.size;
      } catch {
        // File doesn't exist, that's fine
      }
      
      // Write the file
      if (append) {
        await fs.appendFile(safePath, content, 'utf-8');
      } else {
        await fs.writeFile(safePath, content, 'utf-8');
      }
      
      const fileName = path.basename(safePath);
      console.log(`   Wrote ${content.length} characters to ${fileName}`);
      
      return {
        success: true,
        result: {
          path: filePath,
          fileName,
          bytesWritten: content.length,
          mode: append ? 'append' : 'overwrite',
          previouslyExisted: existed,
          previousSize: existed ? previousSize : undefined,
          message: `Successfully ${append ? 'appended to' : 'wrote'} ${fileName}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file',
      };
    }
  },
};

