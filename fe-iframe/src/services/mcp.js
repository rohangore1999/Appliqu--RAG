import {
  experimental_createMCPClient,
  generateText,
  experimental_generateSpeech as generateSpeech,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Helpers
import { base64ToObjectURL, isBase64Image } from "../helpers/common";

// Services
import { getImageDetails } from "./server";

const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || "<your_key>",
});

let conversationHistory = [
  {
    role: "system",
    content: `You are a helpful assistant which will analysis the user input and call the specified tool to get the result.
        - If in LATEST conversation, you get the object of html text, please give the analysis the data and give the summay to seller. ALWAYS ADD THE SUMMARY OF THE RESPONSE IN LAYMANS TERMS IN THE END.
        - If in LATEST conversation, user is asking about the explain DIAGRAM or GRAPHS or any other visual elements IMAGES, please give the output as SCREENSHOT.

        - If you have BLOB LINK "blob:link" in LATEST conversation , please call the tool getDescriptionOfTheImage and give the result to user or User ask to DESCRIBE THE IMAGE AND ALWAYS ADD THE SUMMARY OF THE RESPONSE IN LAYMANS TERMS IN THE END.

        - If in LATEST conversation, user asked about details of the any title or entire page or table or any html kind of questions please give the output as REQUEST_HTML

        Examples:
          - user: "Can you explain what this page does"
          - assistant: "REQUEST_HTML"

          - user: "Can you explain this diagram or graph or map or any visual elements"
          - assistant: "SCREENSHOT"

          - user: "Can you explain the table"
          - assistant: "REQUEST_HTML"
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

      // aiInput = compressedImage;
      aiInput = await getImageDetails(userInput);
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

    const response = await generateText({
      model: openai("gpt-4.1"),
      tools,
      messages: conversationHistory, // Use the entire conversation history
    });

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

export const speak = async (text) => {
  try {
    const audio = await generateSpeech({
      model: openai.speech("tts-1"),
      voice: "coral", // or coral, alloy, etc.
      text: text,
      instructions: "Speak in a cheerful and positive tone.",
    });

    const generatedAudio = audio.audio;

    const audioBlob = new Blob([generatedAudio?.uint8ArrayData], {
      type: "audio/mp3",
    });
    const url = URL.createObjectURL(audioBlob);

    const audioElement = new Audio(url);
    // Play the audio
    audioElement
      .play()
      .then(() => console.log("Audio is playing"))
      .catch((error) => console.error("Error playing audio:", error));

    // Optional: Release the URL when done (e.g., when audio ends)
    audioElement.onended = () => {
      // URL.revokeObjectURL(url);
      // console.log("Audio playback ended, URL revoked");
    };
  } catch (error) {
    console.error("Error generating speech:", error);
  }
};
