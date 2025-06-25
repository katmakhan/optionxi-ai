// Recommended options:

// "llama-3.3-70b-versatile" - The upgraded version of the 70B model (most similar to what you were using)
// "llama-3.1-8b-instant" - Faster, smaller model for quicker responses
// "gemma2-9b-it" - Google's Gemma model

// Other available models:

// "llama3-70b-8192" - Older Llama 3 model with 8K context
// "llama3-8b-8192" - Smaller Llama 3 model
// "llama-guard-3-8b" - Safety-focused model

import { groq } from "@ai-sdk/groq";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, experimental_createMCPClient } from "ai";


export const runtime = "edge";
export const maxDuration = 30;

// // Helper function to create MCP clients
// async function createMCPClients() {
//   const clients = [];
//   const allTools = {};

//   try {
//     // 4. Custom HTTP MCP Server
//     if (process.env.CUSTOM_MCP_SERVER_URL) {
//       const customClient = experimental_createMCPClient({
//         transport: {
//           type: "sse",
//           url: process.env.CUSTOM_MCP_SERVER_URL
//         }
//       });
//       clients.push(customClient);
//       Object.assign(allTools, await customClient.tools());
//     }

//   } catch (error) {
//     console.error("Error setting up MCP clients:", error);
//   }

//   return { clients, tools: allTools };
// }

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();
  // const { clients: mcpClients, tools: mcpTools } = await createMCPClients();


  const result = streamText({
    model: groq("llama-3.3-70b-versatile"), // or use "mixtral-8x7b-32768" or other Groq models
    messages,
    // forward system prompt and tools from the frontend
    toolCallStreaming: true,
    system,
    tools: {
      ...frontendTools(tools),
      // ...mcpTools,
    },
    onError: console.log,
  });

  return result.toDataStreamResponse();
}