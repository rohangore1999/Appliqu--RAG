import { useState, useEffect, useRef } from "react";
import {
  experimental_createMCPClient,
  generateText,
  experimental_generateSpeech as generateSpeech,
} from "ai";

import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({
  apiKey:
    "your_key", // Replace with your OpenAI API key
});

export default function App() {
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
        URL.revokeObjectURL(url);
        console.log("Audio playback ended, URL revoked");
      };
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
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant of Partner Portal, Please give summary of the Dashboard of whatever html data you get along with the components used as the user Input.",
          },
          { role: "user", content: userInput },
        ],
      });

      console.log("response >>>", response);

      if (response.toolResults.length) {
        const toolCallResponse = response.toolResults[0].result.content[0].text;
        console.log({ toolCallResponse });

        speak(toolCallResponse);

        setMessages((prev) => [
          ...prev,
          { from: "assistant", text: toolCallResponse },
        ]);
      } else {
        speak(response.text);

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
    // if (!input.trim()) return;
    // mcpClient(input);

    // setMessages((prev) => [...prev, { from: "user", text: input }]);
    // setInput("");

    window.addEventListener("message", function (event) {
      // Always verify the sender in production!
      // if (event.origin !== 'https://trusted-parent-domain.com') return;

      console.log("Message received from parent:", event.data);

      // Process the HTML or other data sent from parent
      if (event.data.html) {
        console.log("Parent HTML received:", event.data.html);
        // speak(event.data.html);
        mcpClient(event.data.html);
        // Do something with the HTML
      }
    });

    requestParentInfo();
  };

  function requestParentInfo() {
    window.parent.postMessage(
      {
        action: "REQUEST_HTML",
        from: "iframe",
      },
      "*"
    ); // The '*' allows sending to any origin. In production, specify the exact parent origin
  }

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

    // window.addEventListener("message", function (event) {
    //   // Always verify the sender in production!
    //   // if (event.origin !== 'https://trusted-parent-domain.com') return;

    //   console.log("Message received from parent:", event.data);

    //   // Process the HTML or other data sent from parent
    //   if (event.data.html) {
    //     console.log("Parent HTML received:", event.data.html);
    //     speak(event.data.html);
    //     // Do something with the HTML
    //   }
    // });
    // requestParentInfo();

    // window.addEventListener("message", function (event) {
    //   // Optional: verify event.origin === expected parent origin
    //   if (event.data?.type === "SCREENSHOT") {
    //     const img = new Image();
    //     img.src = event.data.image;
    //     console.log(img);
    //     // document.body.appendChild(img); // or do something else with the image
    //   }
    // });

    // Send the request when the iframe loads

    console.log("Sent request to parent for HTML content");
  }, []);

  var parentWindow = window?.parent;

  // console.log(parentWindow?.document?.documentElement?.outerHTML)
  // const parentHTML = parentWindow?.document?.documentElement?.outerHTML;

  // You can now do whatever you want with the parent HTML
  // For example, you could send it to your server

  // You could also analyze it directly
  // const allLinks = parentWindow?.document?.querySelectorAll("a");

  // Log it to console for debugging
  // console.log("Parent HTML:", parentHTML);
  // console.log("from an iframe >>>", parentWindow);
  // console.log("allLinks >>> ", allLinks);

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
            {msg.from === "assistant" ? msg.text : msg.text}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center space-x-2">
        {/* <button
          onClick={startListening}
          className={`p-2 rounded-full border ${
            listening ? "bg-red-200" : "bg-white"
          }`}
          title="Start voice input"
        > */}
        <img
          onClick={startListening}
          className="bg-pink-200"
          src="https://logosarchive.com/wp-content/uploads/2021/12/Myntra-icon-logo.svg"
          width={50}
          height={50}
          alt="Myntra logo"
        />
        {/* </button> */}
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
