/**
 * ==========================================
 * 📁 List Directory Tool
 * ==========================================
 * 
 * LEARNING NOTE: Directory Exploration
 * 
 * Before reading or writing files, the AI needs to know
 * what files exist. This tool lets it explore directories.
 * 
 * Same safety principles apply:
 * - Sandboxed to workspace directory
 * - Path validation
 * - Size limits on results
 */

import fs from 'fs/promises';
import path from 'path';
import type { Tool, ToolResult } from '../../types/tool.js';
import { validateFilePath } from '../../utils/validation.js';

/**
 * Maximum entries to return
 */
const MAX_ENTRIES = 100;

/**
 * Allowed base directory
 */
const WORKSPACE_DIR = './workspace';

/**
 * File info structure
 */
interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
}

/**
 * List Directory Tool Definition
 */
export const listDirectoryTool: Tool = {
  name: 'list_directory',
  
  description: `List files and directories in the workspace. Use this tool when:
- You need to see what files exist
- The user asks about files in a directory
- You need to find a specific file

Returns a list of files and directories with their types and sizes.
Path should be relative to workspace (use "." for root).`,
  
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Directory path relative to workspace (e.g., ".", "data", "src/components")',
      },
    },
    required: ['path'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const dirPath = (args.path as string) || '.';
      
      // Validate the path
      const validation = validateFilePath(dirPath, WORKSPACE_DIR);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const safePath = validation.sanitized!;
      console.log(`📁 List Directory: ${safePath}`);
      
      // Check if path exists and is a directory
      try {
        const stats = await fs.stat(safePath);
        if (!stats.isDirectory()) {
          return { success: false, error: 'Path is not a directory' };
        }
      } catch {
        return { success: false, error: `Directory not found: ${dirPath}` };
      }
      
      // Read directory contents
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      
      // Build file info array
      const files: FileInfo[] = [];
      
      for (const entry of entries.slice(0, MAX_ENTRIES)) {
        const fullPath = path.join(safePath, entry.name);
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            type: 'directory',
          });
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            files.push({
              name: entry.name,
              type: 'file',
              size: stats.size,
              extension: path.extname(entry.name).toLowerCase() || undefined,
            });
          } catch {
            files.push({
              name: entry.name,
              type: 'file',
            });
          }
        }
      }
      
      // Sort: directories first, then files alphabetically
      files.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log(`   Found ${files.length} items`);
      
      return {
        success: true,
        result: {
          path: dirPath,
          totalItems: files.length,
          truncated: entries.length > MAX_ENTRIES,
          items: files,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list directory',
      };
    }
  },
};

