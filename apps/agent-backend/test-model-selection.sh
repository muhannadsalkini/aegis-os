#!/bin/bash

echo "🧪 Testing Dynamic Model Selection"
echo "=================================="
echo ""

# Test 1: Simple task (should use nano)
echo "Test 1: Simple Task (expected: gpt-4o-nano)"
echo "----------------------------------------"
curl -s -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is 42 + 58?"}
    ]
  }' | jq -r '.response' | head -20

echo ""
echo ""

# Test 2: Moderate task (should use mini)
echo "Test 2: Research Task (expected: gpt-4o-mini)"
echo "----------------------------------------"
curl -s -X POST http://localhost:3001/api/researcher \
  -H "Content-Type: application/json" \
  -d '{
    "task": "What is the capital of France?"
  }' | jq -r '.response' | head -20

echo ""
echo ""

# Test 3: Complex task (should use gpt-4o)
echo "Test 3: Planning Task (expected: gpt-4o)"
echo "----------------------------------------"
curl -s -X POST http://localhost:3001/api/planner \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Create a detailed plan for building a web application"
  }' | jq -r '.response' | head -20

echo ""
echo "✅ Testing complete! Check terminal logs for complexity and model selection."
