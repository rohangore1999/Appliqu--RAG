from agents import Agent, Runner, set_default_openai_client, set_tracing_disabled
from dotenv import load_dotenv
import httpx
import ssl
import asyncio
from openai import AsyncOpenAI
import os
import base64
import re

load_dotenv()

# Create SSL context with verification disabled
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Create HTTP client with SSL verification disabled
http_client = httpx.AsyncClient(verify=False)

# Create custom OpenAI client with disabled SSL verification
custom_openai_client = AsyncOpenAI(
    api_key=os.getenv("OPEN_API_KEY"),
    http_client=http_client
)

# Set the custom client as the default for all agents
set_default_openai_client(custom_openai_client)

# Disable tracing to avoid SSL issues with tracing endpoint
set_tracing_disabled(True)

# Generic Chat Agent for simple greetings and basic conversations
generic_chat_agent = Agent(
    name="Generic Chat Assistant",
    instructions="""
        You are a friendly assistant that handles general conversations, greetings, and basic queries.
        Respond naturally to greetings like "hi", "hello", "how are you", etc.
        For simple questions, provide helpful and concise answers.
        If the user asks about complex analysis or specific content, let them know you can help analyze HTML pages and images for business insights.
    """,
    model="gpt-4o"
)

# HTML Analysis Agent
html_agent = Agent(
    name="HTML Content Analyst",
    instructions="""
        You are an HTML content specialist focused on e-commerce and business analysis.
        Analyze HTML content to identify:
        1. Page structure and navigation elements
        2. Product information, pricing, and inventory details
        3. User interface elements and their functionality
        4. Business-relevant content like catalogs, orders, returns
        5. Administrative features and tools
        
        Provide technical insights about the page's purpose, functionality, and business context.
        Focus on elements that would be relevant for sellers and business operations.
    """,
    model="gpt-4.1"
)

# Image Analysis Agent
image_reader_agent = Agent(
    name="Visual Content Analyst",
    instructions="""
        You are an expert at analyzing visual content including graphs, charts, images, maps, and screenshots.
        When analyzing images, focus on:
        1. Charts and graphs: Extract data trends, patterns, and key metrics
        2. Screenshots: Identify UI elements, navigation, and functionality
        3. Maps: Location-based insights and geographical data
        4. Business dashboards: Performance metrics and KPIs
        5. Product images: Features, quality, and presentation
        
        Provide detailed analysis of visual elements that would help business owners understand:
        - Performance trends
        - User interface design
        - Data insights
        - Operational metrics
        - Areas for improvement
    """,
    model="gpt-4.1"
)

# Seller Summary Agent
seller_summary_agent = Agent(
    name="Seller Business Advisor",
    instructions="""
        You are a business advisor specializing in e-commerce and seller success.
        Your role is to take technical analysis from HTML and image specialists and translate it into:
        
        1. Easy-to-understand business insights in layman's terms
        2. Actionable recommendations for improving sales
        3. Identification of opportunities and potential issues
        4. Practical next steps for sellers
        
        Always structure your response with:
        - **Page/Content Summary**: What this page/content is about
        - **Key Insights**: Important findings in simple language
        - **Opportunities**: Ways to improve sales or operations
        - **Recommendations**: Specific actions the seller can take
        
        Avoid technical jargon and focus on business impact and practical advice.
    """,
    model="gpt-4.1"
)

def is_generic_chat(chat_input):
    """
    Determine if the input is a generic greeting or simple conversation.
    """
    if not chat_input:
        return False
    
    chat_lower = chat_input.lower().strip()
    
    # Common greetings and simple queries
    generic_patterns = [
        r'^(hi|hello|hey|good morning|good afternoon|good evening).*',
        r'^how are you.*',
        r'^what.*can.*you.*do.*',
        r'^help.*',
        r'^thank.*you.*',
        r'^thanks.*',
        r'^bye.*',
        r'^goodbye.*'
    ]
    
    for pattern in generic_patterns:
        if re.match(pattern, chat_lower):
            return True
    
    return False

def requires_analysis(chat_input):
    """
    Determine if the input explicitly requests detailed analysis of content.
    Note: HTML and screenshot are always provided by frontend, so we only check the chat input.
    """
    if not chat_input:
        return False
    
    analysis_keywords = [
        'explain', 'analyze', 'what is', 'describe', 'tell me about',
        'insights', 'summary', 'overview', 'details', 'information',
        'performance', 'sales', 'business', 'improve', 'optimize',
        'show me', 'review', 'check', 'look at', 'examine'
    ]
    
    chat_lower = chat_input.lower()
    return any(keyword in chat_lower for keyword in analysis_keywords)

async def chat(user_input_data):
    """
    Enhanced chat function with agent orchestration and context management.
    Note: Frontend always provides HTML and screenshot data.
    """
    try:
        chat_input = user_input_data.get('chatInput', '')
        html_content = user_input_data.get('html', '')
        screenshot = user_input_data.get('screenshot', '')
        context = user_input_data.get('context', [])  # Previous conversation context
        
        print(f"Processing request - Chat: '{chat_input}', HTML: {len(html_content)} chars, Image: {'Yes' if screenshot else 'No'}, Context items: {len(context)}")
        
        # Build context string from previous interactions
        context_string = ""
        if context:
            context_string = "\n\nPrevious Conversation Context:\n"
            for i, ctx_item in enumerate(context[-5:], 1):  # Keep last 5 context items
                context_string += f"{i}. {ctx_item}\n"
            context_string += "\n"
        
        # Handle generic chat scenarios (regardless of HTML/screenshot presence)
        if is_generic_chat(chat_input):
            print("Routing to generic chat agent")
            full_input = f"{context_string}Current User Input: {chat_input}"
            response = await Runner.run(generic_chat_agent, full_input)
            
            # Add to context and return
            new_context_item = f"User: {chat_input} | Assistant: {response.final_output}"
            updated_context = context + [new_context_item]
            
            return {
                "response": response.final_output,
                "context": updated_context
            }
        
        # Check if detailed analysis is explicitly requested
        if requires_analysis(chat_input):
            print("User explicitly requested analysis")
        else:
            print("No explicit analysis request - defaulting to content analysis since HTML/screenshot provided")
            # Since frontend always provides content, default to analysis for non-generic queries
        
        # Collect analysis results from specialist agents
        analysis_results = []
        
        # Analyze HTML content (always provided by frontend)
        if html_content:
            print("Analyzing HTML content...")
            html_context = f"{context_string}User Query: {chat_input}\n\nHTML Content:\n{html_content}"
            html_analysis = await Runner.run(html_agent, html_context)
            analysis_results.append(f"HTML Analysis:\n{html_analysis.final_output}")
        
        # Analyze image content (always provided by frontend)
        if screenshot:
            print("Analyzing image content...")
            image_context = f"{context_string}User Query: {chat_input}\n\nPlease analyze the provided screenshot/image for business insights, UI elements, charts, graphs, or any visual data that could help a seller improve their business operations."
            
            if screenshot.startswith('data:image'):
                image_context += f"\n\nImage provided: {screenshot[:100]}... (base64 encoded image)"
            
            image_analysis = await Runner.run(image_reader_agent, image_context)
            analysis_results.append(f"Image Analysis:\n{image_analysis.final_output}")
        
        # Generate seller summary from analysis results
        if analysis_results:
            print("Generating seller summary...")
            summary_context = f"{context_string}User Query: {chat_input}\n\n" + "\n\n".join(analysis_results)
            summary_context += "\n\nPlease provide a comprehensive business summary in simple terms that helps the seller understand their page/content and how to improve their sales."
            
            final_summary = await Runner.run(seller_summary_agent, summary_context)
            
            # Add to context and return
            new_context_item = f"User: {chat_input} | Analysis: {final_summary.final_output[:200]}..." if len(final_summary.final_output) > 200 else f"User: {chat_input} | Analysis: {final_summary.final_output}"
            updated_context = context + [new_context_item]
            
            return {
                "response": final_summary.final_output,
                "context": updated_context
            }
        else:
            # Fallback if no content to analyze (shouldn't happen with frontend)
            print("No content to analyze - using generic response")
            full_input = f"{context_string}Current User Input: {chat_input or 'Hello! How can I help you with your business today?'}"
            response = await Runner.run(generic_chat_agent, full_input)
            
            # Add to context and return
            new_context_item = f"User: {chat_input} | Assistant: {response.final_output}"
            updated_context = context + [new_context_item]
            
            return {
                "response": response.final_output,
                "context": updated_context
            }

    except Exception as e:
        print(f"Error in chat processing: {e}")
        return {
            "response": {"error": f"An error occurred while processing your request: {str(e)}"},
            "context": user_input_data.get('context', [])
        }

if __name__ == "__main__":
    # Test with sample data and context management
    async def test_chat_with_context():
        # First interaction
        test_data_1 = {
            "chatInput": "can you explain this page",
            "html": "PARTNER PORTAL\n\nHome\nAdmin\nBuying & Inventory\nCatalog\nOrders & Returns\n",
            "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
            "context": []
        }
        
        print("=== FIRST INTERACTION ===")
        result_1 = await chat(test_data_1)
        print(f"Response: {result_1['response'][:100]}...")
        print(f"Context items: {len(result_1['context'])}")
        
        # Second interaction with context
        test_data_2 = {
            "chatInput": "how can I improve my sales using this portal?",
            "html": "PARTNER PORTAL\n\nHome\nAdmin\nBuying & Inventory\nCatalog\nOrders & Returns\n",
            "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
            "context": result_1['context']  # Pass previous context
        }
        
        print("\n=== SECOND INTERACTION (with context) ===")
        result_2 = await chat(test_data_2)
        print(f"Response: {result_2['response'][:100]}...")
        print(f"Context items: {len(result_2['context'])}")
        
        # Third interaction - generic greeting with context
        test_data_3 = {
            "chatInput": "thank you for the help",
            "html": "PARTNER PORTAL\n\nHome\nAdmin\nBuying & Inventory\nCatalog\nOrders & Returns\n",
            "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA",
            "context": result_2['context']  # Pass updated context
        }
        
        print("\n=== THIRD INTERACTION (generic with context) ===")
        result_3 = await chat(test_data_3)
        print(f"Response: {result_3['response']}")
        print(f"Final context items: {len(result_3['context'])}")
        
        print("\n=== FINAL CONTEXT ARRAY ===")
        for i, ctx in enumerate(result_3['context'], 1):
            print(f"{i}. {ctx[:100]}...")
    
    asyncio.run(test_chat_with_context())