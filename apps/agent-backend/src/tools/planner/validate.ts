/**
 * ==========================================
 * Goal Validation Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Feasibility Analysis
 * 
 * Before executing a plan, a good planner validates feasibility.
 * This tool checks if a goal is achievable and identifies:
 * 1. Missing prerequisites
 * 2. Potential blockers
 * 3. Alternative approaches
 * 4. Risk assessment
 */

import type { Tool } from '../../types/tool.js';
import { openai, defaultModel } from '../../config/openai.js';

interface ValidationResult {
  goal: string;
  isFeasible: boolean;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  prerequisites: string[];
  potentialBlockers: string[];
  alternativeApproaches?: string[];
  recommendation: string;
}

/**
 * Goal Validation Tool
 */
export const goalValidationTool: Tool = {
  name: 'validate_goal',
  description: 'Validate whether a goal is feasible and identify potential issues, missing prerequisites, or alternative approaches. Returns a feasibility assessment with recommendations.',
  
  parameters: {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: 'The goal to validate'
      },
      availableResources: {
        type: 'string',
        description: 'Optional: What tools, skills, or resources are available'
      },
      constraints: {
        type: 'string',
        description: 'Optional: Any constraints or limitations (time, budget, technical, etc.)'
      }
    },
    required: ['goal']
  },
  
  async execute(args: Record<string, unknown>) {
    const { 
      goal, 
      availableResources,
      constraints
    } = args as { 
      goal: string; 
      availableResources?: string;
      constraints?: string;
    };
    
    try {
      console.log(`🔍 Validating goal: "${goal}"`);
      
      const resourcesInfo = availableResources 
        ? `Available resources: ${availableResources}\n`
        : '';
      
      const constraintsInfo = constraints 
        ? `Constraints: ${constraints}\n`
        : '';
      
      const prompt = `Analyze the feasibility of the following goal.

Goal: ${goal}
${resourcesInfo}${constraintsInfo}

Provide a detailed feasibility analysis including:
1. Whether the goal is achievable (true/false)
2. Confidence level in this assessment (low/medium/high)
3. Reasoning for the assessment
4. Prerequisites needed before starting
5. Potential blockers or challenges
6. Alternative approaches if applicable
7. Final recommendation

Format as JSON:
{
  "goal": "restated goal",
  "isFeasible": true|false,
  "confidence": "low|medium|high",
  "reasoning": "detailed explanation",
  "prerequisites": ["prerequisite 1", "prerequisite 2", ...],
  "potentialBlockers": ["blocker 1", "blocker 2", ...],
  "alternativeApproaches": ["approach 1", "approach 2", ...],
  "recommendation": "concise recommendation on how to proceed"
}`;
      
      const response = await openai.chat.completions.create({
        model: defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert analyst who evaluates the feasibility of goals and projects. Provide realistic, thoughtful assessments.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent analysis
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from validation model');
      }
      
      const result: ValidationResult = JSON.parse(content);
      
      const status = result.isFeasible ? '✅ Feasible' : '⚠️ Not feasible';
      console.log(`${status} (${result.confidence} confidence)`);
      
      return {
        success: true,
        result
      };
      
    } catch (error) {
      console.error('Goal validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
