import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // allow your frontend origin
    methods: ["GET", "POST"], // allow specific HTTP methods
    credentials: true, // if you use cookies or credentials
  })
);

const server = new McpServer(
  {
    name: "Applique Component RAG - SSE",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

// tool
server.tool(
  "getAppliqueComponentDetails",
  { query: z.string() },
  async ({ query }) => {
    try {
      const response = await fetch("http://localhost:5001/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
      };
    } catch (e) {
      console.error("Error >>> ", e);
      return {
        content: [
          {
            type: "text",
            text: "Error occurred while fetching data.",
          },
        ],
      };
    }
  }
);

let transport = null;

app.get("/sse", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  transport = new SSEServerTransport("/messages", res);

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

app.listen(3001, () => {
  console.log("MCP SSE Server is running on port 3001");
});
