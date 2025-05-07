import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Applique Component RAG - STDIO",
  version: "1.0.0",
});

async function getAppliqueComponentDetails(query = "") {
  try {
    const response = await fetch("http://localhost:5001/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (e) {
    console.error("Error >>> ", e);
  }
}

// tool
server.tool(
  "getAppliqueComponentDetails",
  { query: z.string() },
  async ({ query }) => {
    const response = await getAppliqueComponentDetails(query);

    return {
      content: [
        {
          type: "text",
          text: response?.response || "No response found.",
        },
      ],
    };
  }
);

async function init() {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

init();
