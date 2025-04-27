import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

app.use(express.json());

const server = new McpServer(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {},
  }
);

async function getAppliqueComponentDetails(query = "") {
  try {
    console.log("Query >>>", query);

    const response = await fetch("http://localhost:5001/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    console.log("response >>> ", response);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    console.log("data >>> ", data);

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
    console.log("Final response >>", response);

    return {
      content: [
        {
          type: "text",
          text: response.response, // << send the text content, not JSON stringified object
        },
      ],
    };
  }
);

let transport = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

app.listen(3000);
