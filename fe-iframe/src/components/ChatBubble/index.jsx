import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MessageCircle, Mic, Camera, X, Send } from "lucide-react";
import { mcpClient } from "../../services/mcp";

const ChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState("default");
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleSpeak = () => {
    console.log("Speak option selected");
    setActiveIcon("mic");
    setShowChat(false); // Close chat window if open
    setIsOpen(false);
  };

  const handleChat = () => {
    console.log("Chat option selected");
    setShowChat(true);
    setActiveIcon("default"); // Keep the chat icon as MessageCircle
    setIsOpen(false);
  };

  const handleSnapshot = () => {
    console.log("Take snapshot option selected");
    setActiveIcon("camera");
    setShowChat(false); // Close chat window if open
    setIsOpen(false);
  };

  const handleReset = () => {
    setActiveIcon("default");
    setShowChat(false);
  };

  // SENDING EVENTS TO PARENTS
  // FOR HTML
  // function requestParentInfo() {
  //   window.parent.postMessage(
  //     {
  //       action: "REQUEST_HTML",
  //       from: "iframe",
  //     },
  //     "*"
  //   ); // The '*' allows sending to any origin. In production, specify the exact parent origin
  // }

  // FOR SCREENSHOTS
  function takeScreenshot() {
    console.log("Asking parent for screenshot");

    window.parent.postMessage(
      {
        action: "TAKE_SCREENSHOT",
        from: "iframe",
      },
      "*"
    ); // The '*' allows sending to any origin. In production, specify the exact parent origin
  }

  const handleSendMessage = async () => {
    debugger;
    if (chatInput.trim()) {
      // MCP Client -> Users message
      setMessages([...messages, { text: chatInput, sender: "user" }]);
      setChatInput("");

      const response = await mcpClient(chatInput);

      if (response.toolResults.length) {
        const toolCallResponse = response.toolResults[0].result.content[0].text;

        setMessages((prev) => [
          ...prev,
          {
            text: toolCallResponse,
            sender: "system",
          },
        ]);
      } else {
        if (response.text === "REQUEST_HTML" || response.text === "SCREENSHOT")
          return;
        setMessages((prev) => [
          ...prev,
          {
            text: response.text,
            sender: "system",
          },
        ]);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderIcon = () => {
    switch (activeIcon) {
      case "mic":
        return <Mic className="h-6 w-6" />;
      case "camera":
        return <Camera className="h-6 w-6" />;
      default:
        return <MessageCircle className="h-6 w-6" />;
    }
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

    // attaching eventListners
    window.addEventListener("message", async function (event) {
      debugger;
      // Optional: verify event.origin === expected parent origin
      if (event.data?.type === "SCREENSHOT") {
        const img = new Image();
        img.src = event.data.image;
        console.log(img);
        const response = await mcpClient(img.src);

        if (response.toolResults.length) {
          const toolCallResponse =
            response.toolResults[0].result.content[0].text;
          console.log({ toolCallResponse });

          // speak(toolCallResponse);

          setMessages((prev) => [
            ...prev,
            { text: toolCallResponse, sender: "system" },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { text: response.text, sender: "system" },
          ]);
        }
      }

      if (event.data?.type === "HTML") {
        console.log("Parent HTML received:", event.data.html);
        // speak(event.data.html);
        const response = await mcpClient(event.data.html);

        if (response.toolResults.length) {
          const toolCallResponse =
            response.toolResults[0].result.content[0].text;
          console.log({ toolCallResponse });

          // speak(toolCallResponse);

          setMessages((prev) => [
            ...prev,
            { text: toolCallResponse, sender: "system" },
          ]);
        } else {
          // speak(response.text);

          setMessages((prev) => [
            ...prev,
            { text: response.text, sender: "system" },
          ]);
        }
      }
    });
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showChat && (
        <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-lg shadow-lg p-4 mb-4 border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Chat</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setShowChat(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md p-2 bg-gray-50 mb-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm mt-32">
                Start a conversation...
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-2 p-2 rounded-lg ${
                    msg.sender === "user"
                      ? "bg-primary text-white ml-auto"
                      : "bg-gray-200 text-gray-800 mr-auto"
                  } max-w-[75%]`}
                >
                  {msg.text}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 resize-none border rounded-l-md py-2 px-3 focus:outline-none focus:border-primary"
              placeholder="Type your message..."
              rows={1}
              style={{ minHeight: "38px", maxHeight: "100px" }}
            />
            <Button
              onClick={handleSendMessage}
              className="rounded-l-none h-[38px]"
              disabled={!chatInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            aria-label="Open chat options"
            onClick={() => {
              if (activeIcon !== "default") {
                handleReset();
                return;
              }
            }}
          >
            {renderIcon()}
          </Button>
        </DropdownMenuTrigger>

        {/* Mic */}
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleSpeak}
            className="cursor-pointer py-2"
          >
            <Mic className="mr-2 h-4 w-4" />
            <span>Speak</span>
          </DropdownMenuItem>

          {/* Chat */}
          <DropdownMenuItem
            onClick={handleChat}
            className="cursor-pointer py-2"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>Chat</span>
          </DropdownMenuItem>

          {/* Snapshot */}
          <DropdownMenuItem
            onClick={handleSnapshot}
            className="cursor-pointer py-2"
          >
            <Camera className="mr-2 h-4 w-4" />
            <span>Take Snapshot</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ChatBubble;
