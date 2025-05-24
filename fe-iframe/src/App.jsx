import { useState, useEffect, useRef } from "react";
import {
  experimental_createMCPClient,
  generateText,
  experimental_generateSpeech as generateSpeech,
} from "ai";

import { createOpenAI } from "@ai-sdk/openai";
import ChatBubble from "./components/ChatBubble";

// const openai = createOpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY || "<your_key>",
// });

export default function App() {
  // const [messages, setMessages] = useState([]);
  // const [input, setInput] = useState("");
  // const [listening, setListening] = useState(false);
  // const recognitionRef = useRef(null);

  // // Initialize Speech Recognition
  // const startListening = () => {
  //   if (recognitionRef.current) {
  //     setListening(true);
  //     recognitionRef.current.start();
  //   }
  // };

  // const speak = async (text) => {
  //   try {
  //     const audio = await generateSpeech({
  //       model: openai.speech("tts-1"),
  //       voice: "coral", // or coral, alloy, etc.
  //       text: text,
  //       instructions: "Speak in a cheerful and positive tone.",
  //     });

  //     const generatedAudio = audio.audio;

  //     const audioBlob = new Blob([generatedAudio?.uint8ArrayData], {
  //       type: "audio/mp3",
  //     });
  //     const url = URL.createObjectURL(audioBlob);

  //     const audioElement = new Audio(url);
  //     // Play the audio
  //     audioElement
  //       .play()
  //       .then(() => console.log("Audio is playing"))
  //       .catch((error) => console.error("Error playing audio:", error));

  //     // Optional: Release the URL when done (e.g., when audio ends)
  //     audioElement.onended = () => {
  //       URL.revokeObjectURL(url);
  //       console.log("Audio playback ended, URL revoked");
  //     };
  //   } catch (error) {
  //     console.error("Error generating speech:", error);
  //   }
  // };

  // const mcpClient = async (userInput) => {
  //   try {
  //     const client = await experimental_createMCPClient({
  //       transport: {
  //         type: "sse",
  //         url: "http://localhost:3000/sse",
  //       },
  //       name: "Applique Component RAG - SSE",
  //     });

  //     debugger;
  //     const tools = await client.tools();

  //     // Convert base64 image to url and upload in aws s3 bucket
  //     function base64ToObjectURL(base64String) {
  //       // Extract the base64 data part if the string includes the data URI scheme
  //       let base64Data = base64String;

  //       // Check if the string includes the data URI scheme (e.g., "data:image/jpeg;base64,")
  //       if (base64String.includes(";base64,")) {
  //         base64Data = base64String.split(";base64,")[1];
  //       }

  //       // Decode the base64 string to binary data
  //       const binaryString = atob(base64Data);

  //       // Create an array buffer to hold the binary data
  //       const bytes = new Uint8Array(binaryString.length);

  //       // Fill the array with the binary data
  //       for (let i = 0; i < binaryString.length; i++) {
  //         bytes[i] = binaryString.charCodeAt(i);
  //       }

  //       // Determine the MIME type from the data URI if present
  //       let mimeType = "image/png"; // Default MIME type
  //       if (base64String.includes("data:")) {
  //         mimeType = base64String.split(":")[1].split(";")[0];
  //       }

  //       // Create a Blob from the array buffer with the appropriate MIME type
  //       const blob = new Blob([bytes], { type: mimeType });

  //       // Create and return an object URL for the Blob
  //       return URL.createObjectURL(blob);
  //     }

  //     const compressedImage = base64ToObjectURL(userInput);

  //     console.log({ compressedImage });

  //     const response = await generateText({
  //       model: openai("gpt-4.1-mini"),
  //       tools,
  //       messages: [
  //         {
  //           role: "system",
  //           content:
  //             "You are a helpful assistant which will analysis the user input and call the specified tool to get the result.",
  //         },
  //         {
  //           role: "user",
  //           content: [
  //             {
  //               type: "text",
  //               text: `Describe this image url by calling getDescriptionOfTheImage tool ${compressedImage}`,
  //             },
  //             // {
  //             //   type: "image",
  //             //   image: compressedImage, // Can be a base64 string, data URL, or http URL
  //             // },
  //           ],
  //         },
  //       ],
  //     });

  //     console.log("response >>>", response);

  //     debugger;
  //     if (response?.toolResults?.length) {
  //       const toolCallResponse = response.toolResults[0].result.content[0].text;
  //       console.log({ toolCallResponse });

  //       speak(toolCallResponse);

  //       setMessages((prev) => [
  //         ...prev,
  //         { from: "assistant", text: toolCallResponse },
  //       ]);
  //     } else {
  //       speak(response.text);

  //       setMessages((prev) => [
  //         ...prev,
  //         { from: "assistant", text: response.text },
  //       ]);
  //     }
  //   } catch (error) {
  //     console.error("Error initializing MCP client:", error);
  //   }
  // };

  // const sendMessage = () => {
  //   if (input.trim()) {
  //     mcpClient(input);

  //     setMessages((prev) => [...prev, { from: "user", text: input }]);
  //     setInput("");
  //   } else {
  //     window.addEventListener("message", function (event) {
  //       // Always verify the sender in production!
  //       // if (event.origin !== 'https://trusted-parent-domain.com') return;

  //       console.log("Message received from parent:", event.data);

  //       // Process the HTML or other data sent from parent
  //       if (event.data.html) {
  //         console.log("Parent HTML received:", event.data.html);
  //         // speak(event.data.html);
  //         mcpClient(event.data.html);
  //         // Do something with the HTML
  //       }
  //     });

  //     requestParentInfo();

  //     takeScreenshot();
  //   }
  // };

  // function requestParentInfo() {
  //   window.parent.postMessage(
  //     {
  //       action: "REQUEST_HTML",
  //       from: "iframe",
  //     },
  //     "*"
  //   ); // The '*' allows sending to any origin. In production, specify the exact parent origin
  // }

  // function takeScreenshot() {
  //   console.log("Asking parent for screenshot");

  //   window.parent.postMessage(
  //     {
  //       action: "TAKE_SCREENSHOT",
  //       from: "iframe",
  //     },
  //     "*"
  //   ); // The '*' allows sending to any origin. In production, specify the exact parent origin
  // }

  // useEffect(() => {
  //   const SpeechRecognition =
  //     window.SpeechRecognition || window.webkitSpeechRecognition;
  //   if (!SpeechRecognition) return;

  //   const recognition = new SpeechRecognition();
  //   recognition.lang = "en-US";
  //   recognition.continuous = false;
  //   recognition.interimResults = false;

  //   recognition.onresult = (event) => {
  //     const transcript = event.results[0][0].transcript;

  //     mcpClient(transcript);

  //     setMessages((prev) => [...prev, { from: "user", text: transcript }]);
  //   };

  //   recognition.onend = () => setListening(false);

  //   recognitionRef.current = recognition;

  //   // speak();

  //   // window.addEventListener("message", function (event) {
  //   //   // Always verify the sender in production!
  //   //   // if (event.origin !== 'https://trusted-parent-domain.com') return;

  //   //   console.log("Message received from parent:", event.data);

  //   //   // Process the HTML or other data sent from parent
  //   //   if (event.data.html) {
  //   //     console.log("Parent HTML received:", event.data.html);
  //   //     speak(event.data.html);
  //   //     // Do something with the HTML
  //   //   }
  //   // });
  //   // requestParentInfo();

  //   window.addEventListener("message", function (event) {
  //     // Optional: verify event.origin === expected parent origin
  //     if (event.data?.type === "SCREENSHOT") {
  //       const img = new Image();
  //       img.src = event.data.image;
  //       console.log(img);
  //       mcpClient(img.src);
  //       // document.body.appendChild(img); // or do something else with the image
  //     }
  //   });

  //   // Send the request when the iframe loads

  //   // console.log("Sent request to parent for HTML content");

  //   // sendScreenshotToIframe();
  // }, []);

  return (
    <>
      {true ? (
        <ChatBubble />
      ) : (
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
      )}
    </>
  );
}
