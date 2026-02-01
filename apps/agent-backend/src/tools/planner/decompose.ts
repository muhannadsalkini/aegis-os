/**
 * ==========================================
 * Task Decomposition Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Planning Agents
 * 
 * Planning agents break down complex goals into actionable steps.
 * This tool uses an LLM to decompose a high-level goal into:
 * 1. Ordered steps (with dependencies)
 * 2. Success criteria for each step
 * 3. Estimated complexity/time
 * 
 * Architecture insight: This is a "planning-first" approach
 * Think → Plan → Validate → Execute
 */

import type { Tool } from '../../types/tool.js';
import { openai, defaultModel } from '../../config/openai.js';

interface TaskStep {
  step: number;
  description: string;
  dependencies: number[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  successCriteria: string;
}

interface DecompositionResult {
  goal: string;
  steps: TaskStep[];
  totalSteps: number;
  estimatedDuration: string;
}

/**
 * Task Decomposition Tool
 */
export const taskDecompositionTool: Tool = {
  name: 'decompose_task',
  description: 'Break down a complex goal or task into ordered, actionable steps with dependencies. Returns a structured plan with success criteria for each step. Use this when you need to plan how to accomplish a complex objective.',
  
  parameters: {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: 'The high-level goal or task to decompose'
      },
      context: {
        type: 'string',
        description: 'Optional: Additional context or constraints for the planning'
      },
      maxSteps: {
        type: 'number',
        description: 'Maximum number of steps to generate (default: 10)'
      }
    },
    required: ['goal']
  },
  
  async execute(args: Record<string, unknown>) {
    const { 
      goal, 
      context,
      maxSteps = 10 
    } = args as { 
      goal: string; 
      context?: string;
      maxSteps?: number;
    };
    
    try {
      console.log(`📋 Decomposing goal: "${goal}"`);
      
      const contextInstruction = context 
        ? `Additional context: ${context}\n\n`
        : '';
      
      const prompt = `${contextInstruction}Break down the following goal into actionable steps.

Goal: ${goal}

Create a step-by-step plan with:
1. Steps ordered logically (max ${maxSteps} steps)
2. Dependencies (which steps must be completed before this one)
3. Complexity estimate (low/medium/high)
4. Clear success criteria for each step
5. Overall estimated timeline

Format as JSON:
{
  "goal": "restated goal",
  "steps": [
    {
      "step": 1,
      "description": "clear action to take",
      "dependencies": [],
      "estimatedComplexity": "low|medium|high",
      "successCriteria": "how to know this step is done"
    }
  ],
  "estimatedDuration": "rough time estimate for the whole goal"
}`;
      
      const response = await openai.chat.completions.create({
        model: defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert project planner. Break down complex goals into clear, actionable steps with proper sequencing and dependencies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4, // Medium-low for consistent planning
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from planning model');
      }
      
      const result: DecompositionResult = JSON.parse(content);
      
      console.log(`✅ Generated plan with ${result.steps?.length || 0} steps`);
      
      return {
        success: true,
        result: {
          ...result,
          totalSteps: result.steps?.length || 0
        }
      };
      
    } catch (error) {
      console.error('Task decomposition error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
