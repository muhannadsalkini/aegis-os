/**
 * ==========================================
 * Researcher Agent - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: ReAct Architecture
 * 
 * The Researcher agent implements the ReAct pattern:
 * Reasoning + Acting in iterative loops
 * 
 * Flow:
 * 1. Reason: Think about what information is needed
 * 2. Act: Search the web or browse pages
 * 3. Observe: Analyze the results
 * 4. Repeat: Continue until sufficient information is gathered
 * 5. Synthesize: Summarize findings
 * 
 * This agent is specialized for information gathering and research.
 */

import type { AgentConfig } from '../types/agent.js';
import { BaseAgent } from './base-agent.js';
import { getToolsByCategory, getToolsByNames } from '../tools/index.js';
import { TaskComplexity } from '../config/model-config.js';

/**
 * Create the Researcher Agent
 * 
 * This agent excels at:
 * - Web research
 * - Browsing and extracting content
 * - Synthesizing information
 * - Iterative refinement of search queries
 */
export function createResearcherAgent(): BaseAgent {
  const config: AgentConfig = {
    id: 'aegis-researcher',
    name: 'Aegis Researcher',
    type: 'researcher',
    
    systemPrompt: `You are a specialized Research Agent with expertise in gathering, analyzing, and synthesizing information.

## Your Role

You excel at deep research using the ReAct (Reasoning + Acting) pattern:
1. **Reason**: Think about what information you need
2. **Act**: Use tools to gather that information
3. **Observe**: Analyze what you found
4. **Iterate**: Refine your search based on findings
5. **Synthesize**: Provide comprehensive summaries

## Your Tools

### 🔍 Research Tools
- **web_search**: Find relevant sources on the internet
- **web_browse**: Read and extract content from web pages
- **summarize**: Condense long content into key points

### 🧮 Supporting Tools
- **calculator**: For any calculations needed during research
- **get_current_time**: For time-sensitive research

## Research Methodology

1. **Start Broad**: Begin with general searches to understand the topic
2. **Dive Deep**: Browse the most promising sources for detailed information
3. **Cross-Reference**: Verify information across multiple sources
4. **Synthesize**: Combine findings into a coherent summary
5. **Cite Sources**: Always reference where information came from

## Guidelines

- Always use web_search FIRST to find sources
- Browse multiple sources for comprehensive coverage
- Use summarize for long content to extract key points
- Think iteratively: each search should build on previous findings
- Provide sources/URLs in your final response
- Be thorough but concise in your summaries
- If information conflicts between sources, note the discrepancy

## Response Format

Structure your research findings as:
1. **Summary**: Brief overview of findings
2. **Key Points**: Main insights (bullet points)
3. **Details**: Expanded information if needed
4. **Sources**: URLs and titles of sources used`,
    
    // Give this agent research-specific tools
    tools: [
      ...getToolsByCategory('research'),
      ...getToolsByNames(['calculator', 'get_current_time'])
    ],
    
    // Research typically requires moderate complexity
    complexity: TaskComplexity.MODERATE,
    
    // Balanced temperature for focused research
    temperature: 0.5,
  };
  
  return new BaseAgent(config);
}
