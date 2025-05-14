import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  experimental_createMCPClient,
  generateText,
  experimental_generateSpeech as generateSpeech,
} from "ai";

import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey: "<your-openai-api-key>", // Replace with your OpenAI API key
});

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition

  const startListening = () => {
    if (recognitionRef.current) {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const speak = async (text) => {
    try {
      const { audio } = await generateSpeech({
        model: openai.speech("tts-1"),
        voice: "coral", // or coral, alloy, etc.
        text: "Hello from the AI SDK!",
        outputFormat: "mp3", // 👈 ensures browser compatibility
        instructions: "Speak in a cheerful and positive tone.",
      });

      //   debugger;
      const audioBlob = new Blob([audio], { type: "audio/mpeg" });
      const url = URL.createObjectURL(audioBlob);

      const audioElement = new Audio(url);
      await audioElement.play();
    } catch (error) {
      console.error("Error generating speech:", error);
    }
  };

  const mcpClient = async (userInput) => {
    try {
      const client = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url: "http://localhost:3001/sse",
        },
        name: "Applique Component RAG - SSE",
      });

      const tools = await client.tools();

      const response = await generateText({
        model: openai("gpt-4o-mini"),
        tools,
        messages: [{ role: "user", content: userInput }],
      });

      console.log(response);

      if (response.toolResults.length) {
        const toolCallResponse = response.toolResults[0].result.content[0].text;
        console.log({ toolCallResponse });

        setMessages((prev) => [
          ...prev,
          { from: "assistant", text: toolCallResponse.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { from: "assistant", text: response.text },
        ]);
      }
    } catch (error) {
      console.error("Error initializing MCP client:", error);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    mcpClient(input);

    setMessages((prev) => [...prev, { from: "user", text: input }]);
    setInput("");
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;

      mcpClient(transcript);

      setMessages((prev) => [...prev, { from: "user", text: transcript }]);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    // speak();
  }, []);

  return (
    <div className="p-4 max-w-md mx-auto h-[90vh] flex flex-col">
      <div className="flex-1 overflow-y-auto border rounded p-2 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-xs ${
              msg.from === "user"
                ? "bg-blue-100 self-end text-right"
                : "bg-gray-100 self-start text-left"
            }`}
          >
            {msg.from === "assistant" ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center space-x-2">
        <button
          onClick={startListening}
          className={`p-2 rounded-full border ${
            listening ? "bg-red-200" : "bg-white"
          }`}
          title="Start voice input"
        >
          🎤
        </button>
        <input
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or use mic..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-1 rounded"
        >
          Send
        </button>
        <button onClick={() => speak("Hello from the AI SDK!")}>
          🔊 Speak
        </button>
      </div>
    </div>
  );
}
