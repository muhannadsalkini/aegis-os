# 📖 Glossary - AI Agent Terminology

> Quick reference for terms you'll encounter while building Aegis OS

---

## A

### Agent
An LLM with a specific role, access to tools, and the ability to reason about when to use those tools. More than just a chat — it's an AI that can take actions.

### API Key
A secret string that authenticates your requests to OpenAI's API. Keep it secret!

---

## C

### Chat Completion
The API endpoint for conversational AI. You send messages, it responds. The foundation of all chat applications.

### Context Window
The maximum amount of text (tokens) an LLM can process at once. GPT-4o has a 128K token context window.

---

## E

### Embedding
A numerical representation of text as a vector (list of numbers). Used for semantic search in RAG systems.

---

## F

### Function Calling
The ability of an LLM to request that you execute a function with specific arguments. Also called "tool use."

---

## J

### JSON Schema
A standard format for describing the structure of JSON data. Used to define tool parameters so the LLM knows what arguments to provide.

---

## L

### LLM (Large Language Model)
The AI model that processes text. Examples: GPT-4o, Claude, Llama. These predict the next token based on training data.

---

## M

### MCP (Model Context Protocol)
A protocol from Anthropic for standardizing how AI assistants interact with external tools and data sources.

### Message
A unit of conversation. Has a role (user, assistant, system, tool) and content.

---

## O

### OpenAI SDK
The official library for interacting with OpenAI's API. Handles authentication, requests, and responses.

---

## P

### Prompt
The input text given to an LLM. Can be a user question, system instructions, or context.

---

## R

### RAG (Retrieval Augmented Generation)
A technique where you retrieve relevant documents and inject them into the prompt, giving the LLM access to external knowledge.

### ReAct
A prompting pattern: Reason → Act → Observe → Repeat. The agent thinks, takes action, sees results, and continues.

---

## S

### Streaming
Receiving the LLM's response token-by-token as it's generated, rather than waiting for the complete response.

### System Prompt
Special instructions at the start of a conversation that define the AI's behavior, personality, and capabilities.

---

## T

### Temperature
A parameter (0-2) controlling response creativity. 0 = deterministic, 2 = very random.

### Token
A unit of text processing. Roughly 4 characters in English. Used for billing and context limits.

### Tool
A function that an LLM can request to be executed. Has a name, description, and parameters schema.

### Tool Call
When the LLM decides to use a tool. Contains the tool name and arguments.

### Tool Result
The output from executing a tool, sent back to the LLM.

---

## V

### Vector Database
A database optimized for storing and searching embeddings. Examples: pgvector, Pinecone, Qdrant.

---

## 📚 Learn More

As you progress through the phases, these concepts will become clearer through hands-on experience!


