# Phase 4 Glossary: Agent Types & Multi-Agent Systems

## Agent Architecture Terms

### Agent
An LLM instance with a specific personality (system prompt), set of tools, and behavior pattern. Different from a simple LLM call because it has reasoning capabilities and can use tools autonomously.

### Agent Architecture
The pattern or methodology an agent follows to solve problems. Common architectures include ReAct, Planning-First, and Delegation.

### Agent Zoo
A collection of specialized agents, each with different capabilities and architectures, that can work independently or collaboratively.

### Base Agent
The foundational agent class that implements the core tool-calling loop. Specialized agents are built on top of this base.

### Multi-Agent System
A system where multiple specialized agents collaborate to solve complex tasks that single agents cannot handle efficiently.

---

## Architecture Patterns

### ReAct (Reasoning + Acting)
An agent architecture that alternates between reasoning about what to do next and taking actions (using tools). Pattern: Reason → Act → Observe → Repeat.

**Example:** Researcher agent that searches the web, reads results, decides what else to search, reads more, then synthesizes findings.

### Planning-First
An agent architecture that emphasizes validation and planning before execution. Pattern: Understand → Validate → Decompose → Structure → Present.

**Example:** Planner agent that validates if a goal is feasible, then breaks it down into ordered steps with dependencies.

### Delegation Pattern
An agent architecture where the agent doesn't do work itself but routes tasks to specialized agents. Pattern: Analyze → Route → Delegate → Aggregate.

**Example:** Orchestrator agent that sends research tasks to the researcher and planning tasks to the planner.

### Agentic Loop
The iterative process where an agent calls the LLM, executes requested tools, sends results back, and repeats until the LLM provides a final text response.

---

## Agent Types

### Researcher Agent
Specialized agent for information gathering using the ReAct pattern. Has tools for web search, content browsing, and summarization.

### Planner Agent  
Specialized agent for strategic planning using the Planning-First pattern. Has tools for goal decomposition and feasibility validation.

### Orchestrator Agent
Specialized agent for coordinating other agents using the Delegation pattern. Has tools for delegating tasks and coordinating parallel execution.

### Conversational Agent
General-purpose agent for typical chat interactions. Has access to many tools but no specific specialization.

---

## Multi-Agent Concepts

### Agent Delegation
The process of one agent sending a task to another specialized agent for execution. The delegating agent receives the specialist's response and uses it to continue its own work.

### Agent Coordination
Managing multiple agents working on different tasks simultaneously, aggregating their results, and handling failures gracefully.

### Circular Delegation
An error condition where Agent A delegates to Agent B, which delegates back to Agent A, creating an infinite loop. Must be prevented by tracking active delegations.

### Delegation Chain
The sequence of delegations from one agent to another. Example: User → Orchestrator → Researcher → (result) → Orchestrator → User.

### Agent Communication Protocol
The standardized way agents pass information between each other, typically through delegation tools with structured inputs/outputs.

---

## Tool Categories

### Research Tools
Tools for gathering and synthesizing information from external sources.

**Examples:**
- `web_search` - Search the internet
- `web_browse` - Fetch and parse web pages
- `summarize` - Condense long text into key points

### Planning Tools
Tools for strategic thinking, goal analysis, and task breakdown.

**Examples:**
- `decompose_task` - Break complex goals into steps
- `validate_goal` - Assess feasibility of objectives

### Orchestration Tools
Tools for multi-agent coordination and workflow management.

**Examples:**
- `delegate_to_agent` - Route task to specialist agent
- `coordinate_agents` - Execute multiple agents in parallel

---

## Tool Concepts

### Tool Specialization
The practice of giving each agent only the tools relevant to its role, rather than all available tools. Reduces decision paralysis and improves tool selection.

### LLM-Powered Tool
A tool that internally uses an LLM to perform its function. Example: the `summarize` tool uses an LLM to generate summaries.

**Note:** This creates a nested LLM call pattern: Agent LLM → calls tool → Tool calls LLM → returns result → Agent LLM continues.

### Tool Chaining
When an agent uses multiple tools sequentially, with each tool's output informing the next tool call.

**Example:** `web_search` → `web_browse` → `summarize`

---

## System Prompt Engineering

### Role Definition
The section of a system prompt that explicitly states what the agent is and what it specializes in.

**Example:** "You are a specialized Research Agent with expertise in gathering, analyzing, and synthesizing information."

### Methodology Section
The part of a system prompt that explains HOW the agent should approach problems (its architecture).

**Example:** For ReAct: "1. Reason about what information you need, 2. Act by using tools, 3. Observe the results, 4. Iterate until complete."

### Guidelines Section
Specific rules and best practices for the agent to follow.

**Example:** "ALWAYS use web_search FIRST before browsing pages" or "Validate goals before decomposing them."

### Response Format Section
Instructions on how to structure the final output.

**Example:** "Structure your response as: 1. Summary, 2. Key Points, 3. Details, 4. Sources"

---

## Web Scraping & Parsing

### HTML Parsing
Converting raw HTML into a structured DOM (Document Object Model) that can be queried and manipulated. We use the `cheerio` library for this.

### Content Extraction
The process of identifying and extracting the main content from a web page while removing navigation, ads, footers, and other noise.

### Main Content Heuristics
Rules for identifying what counts as "main content" on a web page, such as looking for `<main>`, `<article>`, or `.content` elements.

### Markdown Conversion
Converting HTML structures (headings, paragraphs, lists) into markdown format for easier processing by LLMs.

---

## Summarization Concepts

### Key Points Extraction
Identifying and listing the most important facts or ideas from a longer text.

### Compression Ratio
The ratio between original text length and summary length. Example: 5000 chars → 500 chars = 10:1 compression ratio.

### Focus Area
An optional parameter for summarization that tells the summarizer what aspect to emphasize (e.g., "technical details", "main arguments", "key findings").

---

## Coordination Patterns

### Sequential Delegation
Delegating tasks one after another, where each task depends on the previous one's results.

**Example:**  
1. Research topic
2. Use research results to create plan

### Parallel Delegation
Delegating multiple independent tasks simultaneously to save time.

**Example:**  
1. Research topic A & Research topic B (parallel)
2. Combine findings

### Result Aggregation
The process of combining outputs from multiple agents into a single cohesive response.

---

## Agent Registry

### Agent Registry
A centralized map/dictionary that stores all available agents by ID, allowing lookup and initialization.

```typescript
const agentRegistry = new Map<string, BaseAgent>();
```

### Agent Factory Function
A function that creates and configures a specialized agent instance.

**Example:** `createResearcherAgent()` returns a configured Researcher agent.

### Agent Initialization
The process of creating agent instances and registering them in the agent registry when the server starts.

---

## Planning Concepts

### Goal Decomposition
Breaking down a high-level objective into specific, actionable steps.

**Example:**  
"Build a RAG pipeline" →  
1. Set up vector database  
2. Implement document parsing  
3. Create embedding pipeline  
...

### Dependency Mapping
Identifying which steps must be completed before others can begin.

**Example:** Step 3 depends on Steps 1 and 2 being complete.

### Feasibility Assessment
Evaluating whether a goal is achievable given available resources and constraints.

**Output:** Boolean (feasible/not feasible) + confidence level + reasoning

### Prerequisites
Things that must exist or be completed BEFORE starting work on a goal.

**Example:** "Python knowledge", "OpenAI API access", "Database setup"

### Potential Blockers
Obstacles that might prevent goal completion.

**Example:** "Limited time for testing", "Integration complexity", "Dataset quality issues"

### Success Criteria
Specific, measurable conditions that indicate a step or goal is complete.

**Example:** "API returns 200 status" or "Tests pass" or "Documentation is published"

---

## Error Handling

### Circular Delegation Prevention
The mechanism that tracks active delegations and throws an error if an agent tries to delegate to itself or create a loop.

### Graceful Degradation
Designing agents to provide useful responses even when tools fail or delegations error.

**Example:** If web search fails, fall back to general knowledge.

### Timeout Handling
Setting maximum time limits for agent operations and handling cases where agents exceed these limits.

---

## Agent Configuration

### Agent Config
The object that defines an agent's properties:
- `id`: Unique identifier
- `name`: Display name
- `type`: Agent type (researcher, planner, etc.)
- `systemPrompt`: The agent's instructions
- `tools`: Array of available tools
- `temperature`: Creativity level (0-2)

### Temperature
A parameter (0-2) that controls how creative/random the LLM's responses are:
- **0-0.3**: Very focused, deterministic (good for planning/analysis)
- **0.4-0.7**: Balanced (good for general conversation)
- **0.8-2.0**: Very creative, diverse (good for brainstorming)

---

## API Endpoints

### Orchestrator Endpoint
`POST /api/orchestrator` - High-level API for complex multi-agent tasks. Routes work through the orchestrator agent automatically.

### Agent-Specific Endpoint
`POST /agents/{agentId}/chat` - Direct access to a specific agent by ID.

**Example:** `POST /agents/aegis-researcher/chat`

---

## Best Practices

### Single Responsibility Principle (for Agents)
Each agent should excel at ONE specific type of task, not be a "jack of all trades."

### Tool Minimalism
Give agents only the tools they need, not every available tool. Reduces confusion and improves decision-making.

### Context Passing
When delegating between agents, include relevant context from previous agents' responses.

### Explicit Architecture
System prompts should explicitly describe the agent's methodology (ReAct, Planning-First, etc.), not leave it implicit.
