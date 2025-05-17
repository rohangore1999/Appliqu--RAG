import { experimental_createMCPClient, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Helpers
import { base64ToObjectURL, isBase64Image } from "../helpers/common";

const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "<your_key>",
});

let conversationHistory = [
  {
    role: "system",
    content: `You are a helpful assistant which will analysis the user input and call the specified tool to get the result.
        - If you get the object of html text, please give the analysis the data and give the summay to seller.
        - If user is asking about the explain DIAGRAM or GRAPHS or any other visual elements IMAGES, please give the output as SCREENSHOT.
        - If you have BLOB LINK "blob:link" in LATEST conversation , please call the tool getDescriptionOfTheImage and give the result to user or User ask to DESCRIBE THE IMAGE.
        - If user asked about details of the entire page or table or any html kind of questions please give the output as REQUEST_HTML
      `,
  },
];

export const mcpClient = async (userInput) => {
  try {
    const client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: "http://localhost:3000/sse",
      },
      name: "Applique Component RAG - SSE",
    });

    const tools = await client.tools();

    let aiInput;
    if (isBase64Image(userInput)) {
      // Converting base64 to imageUrl
      const compressedImage = base64ToObjectURL(userInput);

      console.log({ compressedImage });

      aiInput = compressedImage;
    } else {
      aiInput = userInput;
    }

    // Add the new user message to conversation history
    conversationHistory.push({
      role: "user",
      content: [
        {
          type: "text",
          text: aiInput,
        },
        // Image content would be added here if needed
      ],
    });

    debugger;
    const response = await generateText({
      model: openai("gpt-4.1-mini"),
      tools,
      messages: conversationHistory, // Use the entire conversation history
    });

    console.log("response >>>", response);

    if (response.text === "REQUEST_HTML") {
      // Sending HTML event to parent
      window.parent.postMessage(
        {
          action: "REQUEST_HTML",
          from: "iframe",
        },
        "*"
      ); // The '*' allows sending to any origin. In production, specify the exact parent origin
    }

    if (response.text === "SCREENSHOT") {
      window.parent.postMessage(
        {
          action: "TAKE_SCREENSHOT",
          from: "iframe",
        },
        "*"
      ); // The '*' allows sending to any origin. In production, specify the exact parent origin
    }

    // Add the AI's response to the conversation history for future context
    conversationHistory.push({
      role: "assistant",
      content: response.text,
    });

    return response;
  } catch (error) {
    console.error("Error initializing MCP client:", error);
    return { text: "Error: " + error.message };
  }
};

// Function to clear conversation history if needed
export const clearConversationHistory = () => {
  conversationHistory = [
    {
      role: "system",
      content: `You are a helpful assistant which will analysis the user input and call the specified tool to get the result.
          - If you get the html text, please give the analysis the data and give the summay to seller.
          - If user asked about details of the entire page or table or any html kind of questions please give the output as REQUEST_HTML ONLY
          - If user is asking about the graph or any diagram or any other visual elements image, please give the output as SCREENSHOT ONLY
        `,
    },
  ];

  return { status: "Conversation history cleared" };
};
