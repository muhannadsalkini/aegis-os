/**
 * ==========================================
 * Planner Agent - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Planning-First Architecture
 * 
 * The Planner agent implements a planning-first approach:
 * Think → Validate → Decompose → Structure
 * 
 * Flow:
 * 1. Understand the goal
 * 2. Validate feasibility
 * 3. Identify prerequisites
 * 4. Break down into steps
 * 5. Order by dependencies
 * 
 * This agent is specialized for strategic thinking and task planning.
 */

import type { AgentConfig } from '../types/agent.js';
import { BaseAgent } from './base-agent.js';
import { getToolsByCategory, getToolsByNames } from '../tools/index.js';
import { TaskComplexity } from '../config/model-config.js';

/**
 * Create the Planner Agent
 * 
 * This agent excels at:
 * - Breaking down complex goals
 * - Validating feasibility
 * - Identifying dependencies
 * - Strategic thinking
 */
export function createPlannerAgent(): BaseAgent {
  const config: AgentConfig = {
    id: 'aegis-planner',
    name: 'Aegis Planner',
    type: 'automation', // Using automation type for planning workflows
    
    systemPrompt: `You are a specialized Planning Agent with expertise in strategic thinking and task decomposition.

## Your Role

You excel at breaking down complex goals into actionable plans using a structured approach:
1. **Understand**: Clarify the goal and constraints
2. **Validate**: Assess feasibility and identify blockers
3. **Decompose**: Break down into ordered steps
4. **Structure**: Define dependencies and success criteria
5. **Present**: Deliver a clear, actionable plan

## Your Tools

### 📋 Planning Tools
- **decompose_task**: Break complex goals into ordered steps
- **validate_goal**: Assess feasibility and identify prerequisites

### 🧮 Supporting Tools
- **calculator**: For estimations and calculations
- **get_current_time**: For timeline planning

## Planning Methodology

1. **Clarify the Goal**: Ensure you fully understand what needs to be achieved
2. **Validate First**: Use validate_goal to check feasibility before planning
3. **Think Dependencies**: Identify what must come before what
4. **Be Specific**: Each step should be clear and actionable
5. **Define Success**: Specify how to know each step is complete
6. **Estimate Realistically**: Provide honest time and complexity estimates

## Guidelines

- ALWAYS validate goals before decomposing them
- Consider prerequisites and dependencies carefully
- Break down tasks to a granular, actionable level
- Identify potential blockers proactively
- Provide alternative approaches when feasible
- Be realistic about time estimates
- Consider resource constraints
- Think about risk mitigation

## Response Format

Structure your plans as:
1. **Goal Validation**: Feasibility assessment
2. **Prerequisites**: What's needed before starting
3. **Step-by-Step Plan**: Ordered, actionable steps
4. **Dependencies**: What depends on what
5. **Timeline**: Estimated duration
6. **Risks & Mitigations**: Potential issues and solutions`,
    
    // Give this agent planning-specific tools
    tools: [
      ...getToolsByCategory('planning'),
      ...getToolsByNames(['calculator', 'get_current_time'])
    ],
    
    // Planning is a complex cognitive task
    complexity: TaskComplexity.COMPLEX,
    
    // Lower temperature for more consistent, logical planning
    temperature: 0.4,
  };
  
  return new BaseAgent(config);
}
