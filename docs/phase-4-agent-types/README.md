# 📚 Phase 4: Agent Types & Multi-Agent Systems

> **Goal:** Build specialized AI agents with different architectures that can work together as an "Agent Zoo"

## 🎯 What You'll Learn

By the end of this phase, you'll understand:

1. **Agent Architectures** — ReAct, Planning-First, and Delegation patterns
2. **Multi-Agent Systems** — How agents collaborate to solve complex tasks
3. **Tool Specialization** — Giving agents domain-specific capabilities
4. **Agent Orchestration** — Coordinating multiple agents efficiently
5. **Circular Delegation Prevention** — Avoiding infinite loops in agent collaboration

---

## 📖 Core Concept: What Makes an Agent "Specialized"?

### The Problem

A single "general purpose" agent with access to ALL tools faces challenges:

- 🤔 **Decision Paralysis** — Too many tools to choose from
- 📊 **Context Dilution** — System prompt becomes too generic
- 🎯 **Lack of Focus** — No expertise in any particular domain
- 🔄 **Poor Tool Selection** — Doesn't know when to use specialized workflows

### The Solution: Specialized Agents

Instead of one generalist, create **specialized agents** that excel at specific tasks:

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE AGENT ZOO                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔍 RESEARCHER AGENT                                            │
│     • Web search                                                │
│     • Content browsing                                          │
│     • Summarization                                             │
│     • ReAct architecture                                        │
│                                                                 │
│  📋 PLANNER AGENT                                               │
│     • Goal decomposition                                        │
│     • Feasibility analysis                                      │
│     • Dependency mapping                                        │
│     • Planning-first architecture                               │
│                                                                 │
│  🔀 ORCHESTRATOR AGENT                                          │
│     • Task routing                                              │
│     • Agent coordination                                        │
│     • Result aggregation                                        │
│     • Delegation architecture                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Agent Architectures

### 1. ReAct (Reasoning + Acting)

**Used by:** Researcher Agent

**Pattern:**
```
1. REASON: Think about what information is needed
2. ACT: Use tools to gather that information  
3. OBSERVE: Analyze the results
4. REPEAT: Refine search based on findings
5. SYNTHESIZE: Combine all findings into an answer
```

**Example Flow:**
```
User: "Research the latest in quantum computing"

Iteration 1:
  Reason: "Need to find recent developments"
  Act: web_search("latest quantum computing breakthroughs 2024")
  Observe: "Found article about Google's new quantum chip"

Iteration 2:
  Reason: "Should read the article for details"
  Act: web_browse("https://quantum-article.com")
  Observe: "Article mentions 105 qubits and error correction"

Iteration 3:
  Reason: "Article is long, should summarize key points"
  Act: summarize(article_content, focus="technical details")
  Observe: "Key points: 105 qubits, 99.9% fidelity, breakthrough in error correction"

Synthesize: [Comprehensive research report with sources]
```

**Key Characteristics:**
- Iterative and exploratory
- Adapts based on findings
- Multiple tool calls per task
- Emphasizes thorough research

---

### 2. Planning-First

**Used by:** Planner Agent

**Pattern:**
```
1. UNDERSTAND: Clarify the goal and constraints
2. VALIDATE: Check if goal is feasible
3. DECOMPOSE: Break into ordered steps
4. STRUCTURE: Define dependencies and success criteria
5. PRESENT: Deliver actionable plan
```

**Example Flow:**
```
User: "Create a plan to build a RAG pipeline"

Step 1 - Validate:
  Tool: validate_goal("build a RAG pipeline")
  Result: {
    feasible: true,
    confidence: "high",
    prerequisites: ["Python knowledge", "OpenAI API", "Database"]
  }

Step 2 - Decompose:
  Tool: decompose_task("build a RAG pipeline")
  Result: {
    steps: [
      {step: 1, description: "Set up vector database", dependencies: []},
      {step: 2, description: "Implement document parsing", dependencies: [1]},
      {step: 3, description: "Create embedding pipeline", dependencies: [2]},
      ...
    ]
  }

Present: [Detailed plan with dependencies, timeline, risks]
```

**Key Characteristics:**
- Validation before execution
- Structured thinking
- Dependency-aware
- Risk assessment included

---

### 3. Delegation

**Used by:** Orchestrator Agent

**Pattern:**
```
1. ANALYZE: Understand the complex request
2. DECOMPOSE: Break into specialized sub-tasks
3. ROUTE: Match sub-tasks to appropriate agents
4. DELEGATE: Send tasks to specialized agents
5. AGGREGATE: Combine results into unified answer
```

**Example Flow:**
```
User: "Research ReAct architecture, then create a plan to implement it"

Analyze:
  - Part 1: Research task → Needs Researcher
  - Part 2: Planning task → Needs Planner
  - Sequential dependency: Research must complete first

Delegate 1:
  Tool: delegate_to_agent(
    agentId: "aegis-researcher",
    task: "Research ReAct architecture pattern"
  )
  Result: [Comprehensive research findings]

Delegate 2:
  Tool: delegate_to_agent(
    agentId: "aegis-planner",
    task: "Create implementation plan for ReAct based on: [research findings]"
  )
  Result: [Step-by-step implementation plan]

Aggregate:
  - Research Section: [Researcher's findings]
  - Implementation Plan: [Planner's output]
  - Combined into cohesive response
```

**Key Characteristics:**
- Coordination over execution
- Leverages specialist expertise
- Handles complex workflows
- Prevents circular delegation

---

## 🛠️ New Phase 4 Tools

### Research Tools

#### `web_browse`
Fetches and parses web pages:
```typescript
{
  name: 'web_browse',
  description: 'Browse a web page and extract main content',
  execute: async (url) => ({
    title: "Page Title",
    content: "Main text in markdown format",
    links: ["url1", "url2", ...]
  })
}
```

**How it works:**
1. Fetches HTML with fetch API
2. Uses cheerio to parse DOM
3. Removes nav, ads, sidebars
4. Extracts main content area
5. Converts to markdown
6. Returns first 5000 chars + links

#### `summarize`
LLM-powered text summarization:
```typescript
{
  name: 'summarize',
  description: 'Summarize long text into key points',
  execute: async (text, focus?) => ({
    summary: "2-3 sentence overview",
    keyPoints: ["point 1", "point 2", "point 3"],
    compressionRatio: "10.5x"
  })
}
```

**Note:** This tool itself calls an LLM! Tools can use AI internally.

---

### Planning Tools

#### `decompose_task`
Breaks complex goals into steps:
```typescript
{
  name: 'decompose_task',
  description: 'Break down complex goal into actionable steps',
  execute: async (goal, context?) => ({
    goal: "Restated goal",
    steps: [
      {
        step: 1,
        description: "Clear actionable step",
        dependencies: [2, 3],
        estimatedComplexity: "medium",
        successCriteria: "How to know it's done"
      }
    ],
    estimatedDuration: "2 weeks"
  })
}
```

#### `validate_goal`
Assesses feasibility:
```typescript
{
  name: 'validate_goal',
  description: 'Validate whether a goal is feasible',
  execute: async (goal, resources?, constraints?) => ({
    isFeasible: true,
    confidence: "high",
    reasoning: "Detailed explanation",
    prerequisites: ["prereq 1", "prereq 2"],
    potentialBlockers: ["blocker 1"],
    alternativeApproaches: ["approach 1"],
    recommendation: "How to proceed"
  })
}
```

---

### Orchestration Tools

#### `delegate_to_agent`
Routes tasks to specialists:
```typescript
{
  name: 'delegate_to_agent',
  description: 'Delegate a task to specialized agent',
  execute: async (agentId, task, context?) => ({
    agentId: "aegis-researcher",
    response: "Agent's full response",
    toolsUsed: ["web_search", "web_browse", "summarize"],
    usage: { tokens: 1500 }
  })
}
```

**Circular Delegation Prevention:**
```typescript
const activeDelegations = new Set<string>();

// Before delegating
const delegationKey = `${agentId}:${task.substring(0, 50)}`;
if (activeDelegations.has(delegationKey)) {
  throw new Error('Circular delegation detected!');
}

// Track and clean up
activeDelegations.add(delegationKey);
try {
  const result = await agent.chat(task);
  return result;
} finally {
  activeDelegations.delete(delegationKey);
}
```

#### `coordinate_agents`
Executes agents in parallel:
```typescript
{
  name: 'coordinate_agents',
  description: 'Coordinate multiple agents simultaneously',
  execute: async (tasks) => ({
    results: [
      { agentId: "researcher", success: true, response: "...", duration: 2300 },
      { agentId: "planner", success: true, response: "...", duration: 1800 }
    ],
    summary: {
      total: 2,
      successful: 2,
      totalDuration: 2300
    }
  })
}
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| **Agents** | |
| `agents/researcher-agent.ts` | ReAct architecture implementation |
| `agents/planner-agent.ts` | Planning-first architecture |
| `agents/orchestrator-agent.ts` | Delegation architecture |
| `agents/index.ts` | Agent registry with initialization |
| **Research Tools** | |
| `tools/web/browse.ts` | Web page fetching and parsing |
| `tools/web/summarize.ts` | LLM-powered summarization |
| **Planning Tools** | |
| `tools/planner/decompose.ts` | Goal decomposition |
| `tools/planner/validate.ts` | Feasibility assessment |
| **Orchestration Tools** | |
| `tools/orchestrator/delegate.ts` | Agent delegation with loop prevention |
| `tools/orchestrator/coordinate.ts` | Parallel agent execution |
| **Routes** | |
| `routes/orchestrator.route.ts` | Multi-agent API endpoint |

---

## 🧪 Try It Yourself!

### 1. List Available Agents

```bash
curl http://localhost:3001/api/orchestrator/agents
```

You should see:
- `aegis-researcher` (Research tasks)
- `aegis-planner` (Planning tasks)
- `aegis-orchestrator` (Complex multi-step tasks)

### 2. Test the Planner Agent

```bash
curl -X POST http://localhost:3001/agents/aegis-planner/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Create a plan to build a simple RAG pipeline"
    }]
  }'
```

Watch it:
1. Use `validate_goal` to check feasibility
2. Use `decompose_task` to create step-by-step plan
3. Return detailed plan with dependencies and timeline

### 3. Test the Researcher Agent

```bash
curl -X POST http://localhost:3001/agents/aegis-researcher/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "Research the ReAct agent architecture pattern"
    }]
  }'
```

Watch it:
1. Use `web_search` to find sources
2. Use `web_browse` to read articles  
3. Use `summarize` to extract key points
4. Synthesize comprehensive research report

### 4. Test the Orchestrator

```bash
curl -X POST http://localhost:3001/api/orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Research what a RAG pipeline is, then create a plan to build one"
  }'
```

Watch it:
1. Analyze: Split into research + planning tasks
2. Delegate to `aegis-researcher` for research
3. Delegate to `aegis-planner` for planning
4. Aggregate both responses
5. Return unified answer

---

## 🎓 Key Takeaways

1. **Specialization > Generalization** — Focused agents with curated tools work better
2. **Architecture Matters** — ReAct, Planning-First, and Delegation serve different purposes
3. **System Prompts Guide Behavior** — Well-crafted prompts encode the architecture
4. **Tools Define Capabilities** — Agents can only do what their tools allow
5. **Orchestration Enables Complexity** — Multi-agent systems solve problems single agents can't
6. **Prevent Infinite Loops** — Track active delegations to avoid circular dependencies

---

## 🔬 Advanced Topics

### Agent Communication Protocols

Agents communicate through the delegation tool:

```typescript
// Orchestrator calls Researcher
const research = await delegate_to_agent(
  'aegis-researcher',
  'Research quantum computing'
);

// Pass research results to Planner
const plan = await delegate_to_agent(
  'aegis-planner',
  `Create plan to learn quantum computing. Context: ${research.response}`
);
```

### Parallel vs Sequential Delegation

**Sequential (dependent tasks):**
```typescript
const research = await delegate_to_agent('researcher', 'Research X');
const plan = await delegate_to_agent('planner', 'Plan X based on: ' + research);
```

**Parallel (independent tasks):**
```typescript
await coordinate_agents([
  { agentId: 'researcher', task: 'Research topic A' },
  { agentId: 'researcher', task: 'Research topic B' }
]);
```

### Building New Agent Types

To create a new specialized agent:

```typescript
// 1. Define the agent configuration
export function createAnalystAgent(): BaseAgent {
  return new BaseAgent({
    id: 'aegis-analyst',
    name: 'Aegis Analyst',
    type: 'automation',
    
    systemPrompt: `You are a data analyst agent...
    [Define role, methodology, guidelines]`,
    
    tools: [
      ...getToolsByCategory('math'),
      customAnalysisTool,
      customVisualizationTool
    ],
    
    temperature: 0.3 // Lower for analytical work
  });
}

// 2. Register in agents/index.ts
const analystAgent = createAnalystAgent();
agentRegistry.set(analystAgent.getConfig().id, analystAgent);

// 3. Add to orchestrator's available agents list
```

---

## 📝 Exercises

### Exercise 1: Test Multi-Agent Workflow
Ask the orchestrator: "Research the benefits of TypeScript, then create a plan to migrate a JavaScript project to TypeScript"

Observe:
- How it breaks down the task
- Which agent it delegates to first
- How it passes context between agents

### Exercise 2: Create a Custom Agent
Build a "Code Reviewer" agent that:
- Has tools for reading files
- Has a system prompt focused on code quality
- Can identify bugs and suggest improvements

### Exercise 3: Add a New Tool
Create a `compare_approaches` tool that:
- Takes multiple options as input
- Uses LLM to evaluate pros/cons
- Returns recommendation with reasoning

---

## ⚠️ Common Pitfalls

1. **Circular Delegation** → Agent A calls Agent B calls Agent A = infinite loop
   - **Solution:** Track active delegations with a Set

2. **Too Many Tool Options** → Agent gets confused
   - **Solution:** Give each agent only relevant tools

3. **Generic System Prompts** → Agent doesn't follow architecture
   - **Solution:** Be explicit about methodology in system prompt

4. **No Context Passing** → Second agent doesn't know what first agent found
   - **Solution:** Include previous results in delegation context

5. **Timeout Issues** → Complex tasks take too long
   - **Solution:** Implement reasonable timeouts and fallbacks

---

## 🎯 Design Principles

### 1. Single Responsibility
Each agent should excel at ONE thing:
- ✅ Researcher = Information gathering
- ✅ Planner = Strategic planning
- ❌ "Helper agent" = Too vague

### 2. Clear Interfaces
Define what each agent accepts and returns:
```typescript
// Good: Clear input/output
delegate_to_agent(
  agentId: string,
  task: string,
  context?: string
) => Promise<AgentResponse>

// Bad: Unclear expectations
callAgent(stuff: any) => Promise<any>
```

### 3. Composability
Agents should work together:
- Orchestrator coordinates others
- Researcher provides facts for Planner
- Planner provides structure for execution

### 4. Graceful Degradation
Handle failures elegantly:
```typescript
try {
  const research = await delegate_to_agent('researcher', task);
} catch (error) {
  // Fallback: answer without research
  return generalKnowledgeResponse();
}
```

---

## 📊 Agent Selection Guide

### When to use Researcher Agent
- ✅ Need current information from the web
- ✅ Fact-checking claims
- ✅ Gathering multiple perspectives
- ✅ Summarizing long documents
- ❌ Mathematical calculations (use default agent)
- ❌ Planning or strategy (use planner)

### When to use Planner Agent
- ✅ Breaking down complex goals
- ✅ Assessing feasibility
- ✅ Creating project timelines
- ✅ Identifying dependencies
- ❌ Executing the plan (that's a different agent!)
- ❌ Researching information (use researcher)

### When to use Orchestrator Agent
- ✅ Tasks requiring multiple specialists
- ✅ Complex multi-step workflows
- ✅ When you need both research AND planning
- ✅ Parallel execution of independent tasks
- ❌ Simple single-agent tasks
- ❌ When you know exactly which specialist to use

---

## ➡️ Next Phase

Once you've mastered multi-agent systems, move on to:
**Phase 5: MCP (Model Context Protocol)** — Connect agents to OS-level tools and external systems!

Or explore:
- **Phase 6: Streaming** — Real-time token-by-token responses
- **Phase 7: Full Aegis OS** — Bring it all together!
