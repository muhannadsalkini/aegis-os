/**
 * ==========================================
 * 🕐 Time Tool - A Simple System Tool
 * ==========================================
 * 
 * LEARNING NOTE: Why does the AI need a time tool?
 * 
 * LLMs are trained on data up to a certain date and don't
 * know the current time. When a user asks "What time is it?"
 * or "What's today's date?", the AI needs a tool to get
 * real-time information.
 * 
 * This is a great example of a "system tool" - a tool that
 * gives the AI access to information it can't know on its own.
 */

import type { Tool, ToolResult } from '../types/tool.js';

/**
 * Get current time information
 */
function getTimeInfo(timezone?: string): Record<string, string> {
  const now = new Date();
  
  // Use specified timezone or default to system timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const formatted = formatter.format(now);
  
  return {
    formatted,
    iso: now.toISOString(),
    timestamp: now.getTime().toString(),
    timezone: options.timeZone || 'UTC',
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    date: now.toLocaleDateString('en-US'),
    time: now.toLocaleTimeString('en-US'),
  };
}

/**
 * The Time Tool Definition
 */
export const timeTool: Tool = {
  name: 'get_current_time',
  
  description: `Get the current date and time. Use this tool whenever the user asks about:
- The current time
- Today's date
- What day of the week it is
- Time in different timezones
This tool returns accurate real-time information.`,
  
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional timezone (e.g., "America/New_York", "Europe/London", "Asia/Tokyo"). If not provided, uses server timezone.',
      },
    },
    required: [],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const timezone = args.timezone as string | undefined;
      const timeInfo = getTimeInfo(timezone);
      
      console.log(`🕐 Time Tool: ${timeInfo.formatted}`);
      
      return {
        success: true,
        result: timeInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get time',
      };
    }
  },
};


