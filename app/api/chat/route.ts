import { groq } from "@ai-sdk/groq";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText, experimental_createMCPClient } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

// Helper function to create MCP clients with proper error handling
async function createMCPClients() {
  const clients = [];
  const allTools = {};

  try {
    // Primary MCP server
    if (process.env.CUSTOM_MCP_SERVER_URL) {
      try {
        console.log("Connecting to primary MCP server:", process.env.CUSTOM_MCP_SERVER_URL);
        
        const customClient = await experimental_createMCPClient({
          transport: {
            type: "sse",
            url: process.env.CUSTOM_MCP_SERVER_URL,
            headers: {
              'Accept': 'application/json, text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          },
          name: "nextjs-mcp-client",
          onUncaughtError: (error) => {
            console.error("MCP uncaught error:", error);
          }
        });
        
        clients.push(customClient);
        
        // Get tools with timeout
        const clientTools = await Promise.race([
          customClient.tools(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Tool loading timeout")), 10000)
          )
        ]);
        
        Object.assign(allTools, clientTools);
        console.log("Primary MCP server connected successfully");
        
      } catch (error) {
        console.error("Failed to connect to primary MCP server:", error);
        // Continue without this server rather than failing completely
      }
    }

    // Secondary MCP server (if needed)
    if (process.env.SECONDARY_MCP_SERVER_URL) {
      try {
        console.log("Connecting to secondary MCP server:", process.env.SECONDARY_MCP_SERVER_URL);
        
        const secondaryClient = await experimental_createMCPClient({
          transport: {
            type: "sse",
            url: process.env.SECONDARY_MCP_SERVER_URL,
            headers: {
              'Accept': 'application/json, text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          },
          name: "nextjs-mcp-client-secondary",
          onUncaughtError: (error) => {
            console.error("Secondary MCP uncaught error:", error);
          }
        });
        
        clients.push(secondaryClient);
        
        const secondaryTools = await Promise.race([
          secondaryClient.tools(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Secondary tool loading timeout")), 10000)
          )
        ]);
        
        Object.assign(allTools, secondaryTools);
        console.log("Secondary MCP server connected successfully");
        
      } catch (error) {
        console.error("Failed to connect to secondary MCP server:", error);
        // Continue without this server
      }
    }

  } catch (error) {
    console.error("Error in MCP client setup:", error);
  }

  console.log(`MCP setup complete: ${clients.length} clients, ${Object.keys(allTools).length} tools`);
  return { clients, tools: allTools };
}

// Safe client cleanup function
async function safeCloseClients(clients: any[]) {
  const closePromises = clients.map(async (client) => {
    try {
      // Add a timeout to prevent hanging
      await Promise.race([
        client.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Close timeout")), 5000)
        )
      ]);
      console.log("MCP client closed successfully");
    } catch (error) {
      console.error("Error closing MCP client:", error);
      // Don't throw - just log and continue
    }
  });

  try {
    await Promise.allSettled(closePromises);
  } catch (error) {
    console.error("Error in bulk client cleanup:", error);
  }
}

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();
  
  let mcpClients: any[] = [];
  let mcpTools = {};

  try {
    const mcpResult = await createMCPClients();
    mcpClients = mcpResult.clients;
    mcpTools = mcpResult.tools;

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      messages,
      toolCallStreaming: true,
      system,
      tools: {
        ...frontendTools(tools),
        ...mcpTools,
      },
      // Handle completion cleanup
      onFinish: async () => {
        console.log("Streaming finished, cleaning up MCP clients");
        await safeCloseClients(mcpClients);
      },
      // Handle error cleanup
      onError: async (error) => {
        console.error("Streaming error:", error);
        await safeCloseClients(mcpClients);
      },
    });

    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("Error in POST handler:", error);
    
    // Emergency cleanup if streamText fails to initialize
    if (mcpClients.length > 0) {
      await safeCloseClients(mcpClients);
    }
    
    // Return a proper error response
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}