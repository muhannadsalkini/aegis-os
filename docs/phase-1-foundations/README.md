# 📚 Phase 1: Foundations

> **Goal:** Understand how LLMs do function calling and build your first "tiny agent"

## 🎯 What You'll Learn

By the end of this phase, you'll understand:

1. **Function Calling** — How LLMs decide when and how to use tools
2. **Tool Schema** — JSON Schema format for defining tool inputs
3. **Tool Execution** — How to run tools and feed results back to the model
4. **The Agent Loop** — How agents iterate until they have an answer

---

## 📖 Core Concept: Function Calling

### What is Function Calling?

Function calling (also called "tool use") is how we give LLMs the ability to interact with the world. The LLM doesn't actually run code — instead, it tells YOU what function to call and with what arguments.

### The Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  User: "What is 25 * 48?"                                       │
│                              ↓                                  │
│  You send to OpenAI:                                            │
│  - The user's message                                           │
│  - A list of available tools (with their schemas)               │
│                              ↓                                  │
│  OpenAI responds with a TOOL CALL:                              │
│  {                                                              │
│    "tool_calls": [{                                             │
│      "id": "call_abc123",                                       │
│      "function": {                                              │
│        "name": "calculator",                                    │
│        "arguments": "{\"operation\":\"multiply\",\"a\":25,\"b\":48}" │
│      }                                                          │
│    }]                                                           │
│  }                                                              │
│                              ↓                                  │
│  YOU execute the calculator:                                    │
│  result = 25 * 48 = 1200                                        │
│                              ↓                                  │
│  You send the result BACK to OpenAI                             │
│                              ↓                                  │
│  OpenAI gives final response:                                   │
│  "25 × 48 = 1200"                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Why Does the LLM Need Tools?

LLMs are **text prediction machines**. They're trained on patterns in text, not actual computation. This means:

- ❌ They can't reliably do math (especially with large numbers)
- ❌ They don't know the current time (trained on old data)
- ❌ They can't access the internet
- ❌ They can't read your files
- ❌ They can't send emails

**Tools bridge this gap!** By giving an LLM access to tools, we let it:

- ✅ Use a calculator for accurate math
- ✅ Get the current time from your system
- ✅ Search the web for information
- ✅ Read and write files
- ✅ Send emails, messages, etc.

---

## 🔧 Anatomy of a Tool

A tool has three parts:

### 1. Name
A unique identifier the LLM uses to reference the tool.

```typescript
name: 'calculator'
```

### 2. Description
A clear explanation of what the tool does. **This is critical!** The LLM reads this to decide when to use the tool.

```typescript
description: `Perform mathematical calculations. Use this tool whenever you need to:
- Add, subtract, multiply, or divide numbers
- Calculate powers or square roots
ALWAYS use this for math - never try to calculate in your head.`
```

### 3. Parameters (JSON Schema)
Defines what inputs the tool accepts. Uses JSON Schema format.

```typescript
parameters: {
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      description: 'The operation to perform',
      enum: ['add', 'subtract', 'multiply', 'divide']
    },
    a: {
      type: 'number',
      description: 'The first number'
    },
    b: {
      type: 'number',
      description: 'The second number'
    }
  },
  required: ['operation', 'a', 'b']
}
```

---

## 🔄 The Agent Loop

When processing a user message, our agent follows this loop:

```
┌─────────────────────────────────────────┐
│           Start with user message        │
└────────────────────┬────────────────────┘
                     ↓
┌─────────────────────────────────────────┐
│    Send message + tools to OpenAI       │
└────────────────────┬────────────────────┘
                     ↓
          ┌──────────┴──────────┐
          ↓                     ↓
┌─────────────────┐   ┌─────────────────────┐
│ Tool call(s)?   │   │   Text response?    │
│      YES        │   │        YES          │
└────────┬────────┘   └──────────┬──────────┘
         ↓                       ↓
┌─────────────────┐   ┌─────────────────────┐
│ Execute tool(s) │   │   Return response   │
│ Send results    │   │       DONE ✅       │
│ back to OpenAI  │   └─────────────────────┘
└────────┬────────┘
         │
         └─────────→ (loop back to "Send message...")
```

This loop continues until the LLM gives a text response without tool calls.

---

## 📁 Key Files to Study

| File | Purpose |
|------|---------|
| `src/tools/calculator.ts` | Your first tool! Study how it's structured |
| `src/types/tool.ts` | Type definitions for tools |
| `src/agents/base-agent.ts` | The agent loop implementation |
| `src/tools/index.ts` | Tool registry pattern |

---

## 🧪 Try It Yourself!

### 1. Start the Server

```bash
cd apps/agent-backend
pnpm install
pnpm dev
```

### 2. Test the Calculator Tool Directly

```bash
curl -X POST http://localhost:3001/tools/calculator/test \
  -H "Content-Type: application/json" \
  -d '{"args": {"operation": "multiply", "a": 25, "b": 48}}'
```

### 3. Chat with the Agent

```bash
curl -X POST http://localhost:3001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is 25 * 48 + 100?"}
    ]
  }'
```

Watch your terminal — you'll see the agent calling the calculator!

### 4. Try Different Questions

- "What time is it?"
- "Calculate 15% of 250"
- "What is the square root of 144?"
- "If I have 3 items at $19.99 each, what's the total?"

---

## 🎓 Key Takeaways

1. **LLMs don't execute code** — They request tool calls, YOU execute them
2. **Tool descriptions matter** — The LLM uses them to decide when to use tools
3. **Results go back to the LLM** — It uses tool results to formulate responses
4. **Multiple iterations** — Complex questions may need several tool calls
5. **JSON Schema** — The standard way to define tool parameters

---

## 📝 Exercises

### Exercise 1: Add a New Operation
Add a `modulo` operation to the calculator tool that returns the remainder of division.

### Exercise 2: Create a New Tool
Create a `random_number` tool that generates a random number between two values.

### Exercise 3: Tool Chaining
Ask the agent: "Roll a random number between 1 and 100, then calculate its square root"
Watch how it chains tool calls!

---

## ➡️ Next Phase

Once you're comfortable with function calling, move on to:
**Phase 2: Tooling Mastery** — Build real-world tools like web search, database access, and email!


