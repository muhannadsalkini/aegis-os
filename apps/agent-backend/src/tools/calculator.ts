/**
 * ==========================================
 * 🧮 Calculator Tool - Your First AI Tool!
 * ==========================================
 * 
 * LEARNING NOTE: Understanding Tools
 * 
 * This is a perfect example of a simple tool. Let's break down
 * what makes a tool work:
 * 
 * 1. SCHEMA: Tells the AI what this tool does and what inputs it needs
 *    - name: Unique identifier the AI uses to call this tool
 *    - description: The AI reads this to decide when to use the tool
 *    - parameters: What inputs the tool accepts (JSON Schema format)
 * 
 * 2. EXECUTOR: The actual function that runs when the AI calls the tool
 *    - Receives the parsed arguments
 *    - Performs the operation
 *    - Returns the result (which goes back to the AI)
 * 
 * WHY DOES THE AI NEED A CALCULATOR?
 * LLMs are bad at math! They predict tokens, not compute. So we give
 * them a calculator tool to offload math operations.
 */

import type { Tool, ToolResult } from '../types/tool.js';

/**
 * Supported mathematical operations
 */
type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage';

/**
 * Execute a mathematical operation
 * 
 * @param operation - The operation to perform
 * @param a - First number
 * @param b - Second number (optional for sqrt)
 */
function calculate(operation: Operation, a: number, b?: number): number {
  switch (operation) {
    case 'add':
      return a + (b ?? 0);
    case 'subtract':
      return a - (b ?? 0);
    case 'multiply':
      return a * (b ?? 1);
    case 'divide':
      if (b === 0) throw new Error('Cannot divide by zero');
      return a / (b ?? 1);
    case 'power':
      return Math.pow(a, b ?? 2);
    case 'sqrt':
      if (a < 0) throw new Error('Cannot take square root of negative number');
      return Math.sqrt(a);
    case 'percentage':
      // Calculate what percentage a is of b, or a% of b
      return b !== undefined ? (a / 100) * b : a / 100;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * The Calculator Tool Definition
 * 
 * This is exported and registered in the tool registry.
 * The AI will see this schema and know how to use the tool.
 */
export const calculatorTool: Tool = {
  name: 'calculator',
  
  // This description is CRITICAL - the AI reads it to decide when to use the tool
  description: `Perform mathematical calculations. Use this tool whenever you need to:
- Add, subtract, multiply, or divide numbers
- Calculate powers (exponents)
- Calculate square roots
- Work with percentages
The AI should NOT attempt mental math - always use this calculator for accuracy.`,
  
  // JSON Schema for the tool's parameters
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'The mathematical operation to perform',
        enum: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'percentage'],
      },
      a: {
        type: 'number',
        description: 'The first number',
      },
      b: {
        type: 'number',
        description: 'The second number (not required for sqrt)',
      },
    },
    required: ['operation', 'a'],
  },
  
  /**
   * Execute the calculator tool
   * 
   * This function is called when the AI decides to use the calculator.
   * The AI provides the operation and numbers, we do the math.
   */
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      // Extract and validate arguments
      const operation = args.operation as Operation;
      const a = args.a as number;
      const b = args.b as number | undefined;
      
      // Perform the calculation
      const result = calculate(operation, a, b);
      
      // Log for debugging (you'll see this in your terminal)
      console.log(`🧮 Calculator: ${operation}(${a}${b !== undefined ? `, ${b}` : ''}) = ${result}`);
      
      // Return the result to the AI
      return {
        success: true,
        result: {
          operation,
          input: { a, b },
          output: result,
          formatted: `${operation}(${a}${b !== undefined ? `, ${b}` : ''}) = ${result}`,
        },
      };
    } catch (error) {
      // If something goes wrong, return an error
      // The AI will see this and can communicate it to the user
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};


