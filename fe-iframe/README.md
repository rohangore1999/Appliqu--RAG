## FE to MCP Server Architecture:

![rag flow image](../media/fe_mcp_architecture.png "FE to MCP Server")

[▶️ Watch the Demo Video of Chat Interaction](https://drive.google.com/file/d/1Evu24ItxcezhdoV-1LenzGx8ZVNfdzsX/view?usp=sharing)

### Parent Injects the Chat App into the Dashboard

```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<script>
// TO send html
window.addEventListener("message", function(event) {
  // Verify sender origin for security
  // if (event.origin !== 'http://localhost:5173') return;
  if (event.data.action === "REQUEST_HTML") {
    // Send the HTML back to the iframe
    event.source.postMessage(
      {
        html: document.body.innerText,
        type: "HTML",
      },
      "*"
    ); // Or specify exact target origin
  }

  if (event.data.action === "TAKE_SCREENSHOT") {
    html2canvas(document.documentElement, {
      allowTaint: true,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      onclone: function(clonedDoc) {
        // This captures elements with fixed positioning correctly
        clonedDoc.documentElement.style.overflow = "hidden";
      },
    }).then((canvas) => {
      const imageData = canvas.toDataURL("image/png");
      const iframe = document.getElementById("myIframe");
      console.log({ imageData });
      iframe.contentWindow.postMessage(
        {
          type: "SCREENSHOT",
          image: imageData,
        },
        "*"
      ); // Replace '*' with exact origin in production
    });
  }
});
</script>

<iframe id="myIframe" src="http://localhost:5173/" style="position: absolute; bottom:0; right:0; z-index: 50; border: none; height: 490px; width: 350px;"></iframe>
```

### Architecture Components

1. **Frontend**

   - Dashboard App: Main application container
   - Chat App: Embedded within an IFrame
   - Communication: Uses postMessage for secure cross-origin communication

2. **Vercel AI SDK Integration**

   - Handles experimental_createMCPClient() for MCP protocol implementation
   - Manages communication between Frontend and MCP Server

3. **MCP Server**

   - Handles two main types of content:
     - Images: Processes image-related requests
     - Text/HTML: Managed by Vercel AI SDK
   - Implements tool calling functionality
   - Communicates with Cloud Storage and Backend

4. **Cloud Storage**

   - Stores and manages images
   - Supports base64 to imageUrl conversion
   - Provides fetch functionality for image retrieval

5. **Backend Server**
   - Processes final requests
   - Handles business logic and data processing

### Flow

1. Dashboard App loads the Chat App in an IFrame
2. User interactions in Chat App communicate with Dashboard via postMessage
3. Requests are processed through Vercel AI SDK's MCP client
4. MCP Server handles requests based on content type:
   - Image requests interact with Cloud Storage
   - Text/HTML is processed directly
5. Processed requests are forwarded to Backend Server
6. Results are returned through the same chain back to the user interface

## Enhanced Multi-Agent Processing (`chat.py`)

The backend now features an advanced multi-agent orchestration system that processes the captured HTML and screenshot data to provide intelligent business insights.

### Multi-Agent Architecture

The system employs **4 specialized AI agents** working in orchestration:

1. **🤖 Generic Chat Agent** - Handles greetings and basic conversations
2. **🌐 HTML Content Analyst** - Analyzes webpage structure and business elements
3. **👁️ Visual Content Analyst** - Processes screenshots and visual data
4. **💼 Seller Business Advisor** - Translates analysis into actionable business insights

### Enhanced Data Flow with Agent Processing

```
Frontend Data Capture → MCP Server → chat.py Agent Orchestration → Business Intelligence Response
```

#### Detailed Processing Pipeline:

```
1. 📱 Frontend: Dashboard captures HTML + Screenshot
   ↓
2. 🔄 IFrame Communication: postMessage data transfer
   ↓
3. 🌐 Vercel AI SDK: MCP client processes request
   ↓
4. 🤖 MCP Server: Routes to chat.py with structured data
   ↓
5. 🧠 Agent Orchestration: Multi-agent analysis pipeline
   ↓
6. 💡 Business Insights: Seller-focused recommendations
   ↓
7. 📤 Response Delivery: Back through MCP → Frontend
```

### Request Processing Logic

#### Input Format to chat.py:

```javascript
{
  chatInput: "can you explain this page",           // User's question
  html: "PARTNER PORTAL\nHome\nAdmin\nBuying...",  // Captured page content
  screenshot: "data:image/png;base64,iVBORw0...",   // Screenshot data
  context: ["User: previous | Assistant: response"] // Conversation history
}
```

#### Agent Routing Decision Tree:

```
User Input Analysis
    ↓
├─ Generic Input ("hi", "hello")
│   └→ 🤖 Generic Chat Agent + Context
│       └→ Friendly response with conversation continuity
│
└─ Analysis Required (default for non-generic)
    └→ 🔄 Multi-Agent Pipeline:
       ├→ 🌐 HTML Agent: Analyzes page structure, navigation, business features
       ├→ 👁️ Image Agent: Processes visual elements, charts, UI components
       └→ 💼 Seller Summary Agent: Converts technical analysis to business insights
```

### Agent Capabilities

#### 🌐 **HTML Content Analyst**

- **Page Structure**: Navigation, layout, business sections
- **E-commerce Elements**: Product catalogs, inventory management, orders
- **Administrative Features**: User roles, permissions, reporting tools
- **Technical Insights**: Framework detection, performance considerations

#### 👁️ **Visual Content Analyst**

- **UI/UX Analysis**: Design patterns, user experience assessment
- **Data Visualization**: Charts, graphs, performance metrics
- **Visual Elements**: Product images, branding, layout quality
- **Accessibility**: Design compliance and usability factors

#### 💼 **Seller Business Advisor**

- **Business Translation**: Technical analysis → Simple business language
- **Opportunity Identification**: Sales improvement areas
- **Actionable Recommendations**: Specific steps for business growth
- **Performance Insights**: KPI analysis and optimization suggestions

### Output Format

#### Structured Business Response:

```javascript
{
  response: `
    **📋 Page Summary**: This is a Partner Portal for managing your e-commerce business...

    **🔍 Key Insights**:
    - The portal provides access to inventory management tools
    - Order tracking and returns processing are centralized
    - Admin features enable business configuration

    **💡 Opportunities**:
    - Optimize inventory levels using the analytics dashboard
    - Streamline order processing workflow
    - Leverage admin tools for better business insights

    **🎯 Recommendations**:
    1. Focus on inventory optimization features
    2. Utilize order analytics for trend analysis
    3. Configure automated alerts for low stock
  `,
  context: ["User: explain page | Analysis: Partner Portal analysis..."]
}
```

### Context Management & Conversation Flow

#### **Conversation Continuity**

- **Context Array**: Maintains last 5 conversation turns
- **Agent Memory**: All agents receive conversation history
- **Follow-up Awareness**: Agents understand previous discussions
- **Progressive Analysis**: Builds on earlier insights

#### **Example Multi-Turn Conversation**:

```
Turn 1: "What is this page?"
→ Full page analysis with business insights

Turn 2: "How can I improve my sales here?"
→ Agent references previous analysis + provides specific sales strategies

Turn 3: "Thanks for the help!"
→ Generic agent with context awareness responds naturally
```

### Frontend Integration Benefits

#### 🚀 **Enhanced User Experience**

- **Real-time Analysis**: Instant business insights from any page
- **Contextual Intelligence**: Page-specific recommendations
- **Conversation Flow**: Natural multi-turn interactions
- **No Page Refresh**: Seamless overlay experience

#### 📊 **Business Intelligence Features**

- **Performance Analysis**: Visual and content-based insights
- **Competitive Intelligence**: UI/UX analysis and recommendations
- **Optimization Suggestions**: Data-driven improvement areas
- **Actionable Insights**: Specific steps for business growth

#### 🔒 **Secure & Efficient**

- **Data Privacy**: Secure postMessage communication
- **Optimized Processing**: Smart context management
- **Error Resilience**: Graceful failure handling
- **Performance Optimized**: Efficient agent orchestration

### Technology Integration

#### **Frontend Stack**

```
React + TypeScript + Vite
    ↓ postMessage API
HTML2Canvas + Base64 Encoding
    ↓ Vercel AI SDK
MCP Client Protocol
```

#### **Backend Stack**

```
MCP Server (STDIO/SSE)
    ↓ Python asyncio
OpenAI GPT-4.1 Agents
    ↓ Custom Orchestration
Business Intelligence Engine
```

This enhanced architecture transforms simple page viewing into intelligent business analysis, providing sellers with actionable insights to improve their e-commerce operations while maintaining a smooth, integrated user experience.
