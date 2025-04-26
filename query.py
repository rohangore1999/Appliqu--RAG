import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI
from qdrant_client import QdrantClient
from langchain_core.documents import Document
from utils import get_collection_name_for_component

# Load environment variables
load_dotenv()

# Function to determine which collection to query based on user input
def route_query_to_collections(query, component_names):
    if not os.getenv("OPEN_API_KEY"):
        print("OPEN_API_KEY not found. Cannot route query.")
        return ["applique_components"]  # Fallback to a default collection
    
    # Create a system prompt for the LLM to determine relevant components
    system_prompt = f"""
        You are a helpful assistant that routes user queries to the appropriate component collections.
        Based on the user's query, determine which component(s) from the Appliqué design system would be most relevant.
        Return ONLY the component names as a comma-separated list, without any other text.

        Available components: {', '.join(component_names)}

        For example:
        - Query: "How do I create a button with an icon?"
        - Response: "button, icon"

        - Query: "How do I show a modal dialog?"
        - Response: "modal"
    """
    
    try:
        # Initialize OpenAI client
        client = OpenAI(
            api_key=os.getenv("OPEN_API_KEY"),
        )
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Query: {query}"}
            ],
            temperature=0
        )
        
        # Extract component names from response
        component_list = response.choices[0].message.content.strip().split(',')
        # Clean up component names
        component_list = [c.strip().lower().replace('-', '_') for c in component_list]
        # Map to collection names
        collection_names = [f"applique_{component}" for component in component_list]
        
        print(f"Query routed to collections: {collection_names}")
        return collection_names
    except Exception as e:
        print(f"Error routing query: {str(e)}")
        # Fallback to a default collection or try to guess based on keywords
        return ["applique_components"]

# Function to search a specific collection using a direct Qdrant client
def search_collection(collection_name, query, embeddings, k=2):
    try:
        # Create a direct connection to Qdrant
        client = QdrantClient(url="http://localhost:6333")
        
        # Check if collection exists
        if not client.collection_exists(collection_name):
            print(f"Collection '{collection_name}' does not exist")
            return []
        
        # Generate embedding for the query
        query_embedding = embeddings.embed_query(query)
        
        # Perform the search
        search_result = client.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=k
        )
        
        # Convert search results to documents
        results = []
        for scored_point in search_result:
            payload = scored_point.payload
            doc = Document(
                page_content=payload.get("page_content", ""),
                metadata=payload.get("metadata", {})
            )
            results.append(doc)
        
        print(f"Found {len(results)} results in collection '{collection_name}'")
        return results
    except Exception as e:
        print(f"Error searching collection '{collection_name}': {str(e)}")
        return []

# Process a query and return RAG response
def process_query(query, component_names):
    # Check if we have API keys
    if not os.getenv("OPEN_API_KEY"):
        return "OPEN_API_KEY not found in environment variables. Cannot process query."
    
    # Create embeddings
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=os.getenv("OPEN_API_KEY")
    )
    
    # Initialize OpenAI client
    client = OpenAI(
        api_key=os.getenv("OPEN_API_KEY"),
    )
    
    # Route query to appropriate collections
    collection_names = route_query_to_collections(query, component_names)
    
    # Perform search across all identified collections
    all_results = []
    for collection_name in collection_names:
        results = search_collection(collection_name, query, embeddings, k=2)
        all_results.extend(results)
    
    # Sort results by relevance (if multiple collections were searched)
    # This would require a reranking step which is a bit complex for this example
    top_results = all_results[:2]  # Just take the top 2 for simplicity
    
    print("\nQuery:", query)
    print("\nTop results:")
    for i, doc in enumerate(top_results):
        print(f"\n{i+1}. Component: {doc.metadata.get('component_name', 'Unknown')}")
        print(f"   URL: {doc.metadata.get('url', 'Unknown')}")
        print(f"   Content preview: {doc.page_content[:150]}...")
    
    # If no results found
    if not top_results:
        return "No relevant information found for your query. Please try a different question about the Appliqué Design System components."
    
    # RAG with OpenAI
    context = "\n\n".join([doc.page_content for doc in top_results])
    
    # Updated system prompt to include example code
    system_prompt = """
        You are a helpful assistant that provides information about Myntra's Appliqué Design System components.
        Use the provided context to answer questions accurately and include the following in your response:

        1. Brief explanation of the component and its purpose
        2. Key features and variations
        3. ALWAYS include practical code examples showing how to use the component (if available in the context)
        4. Any important props or API details

        Your response should be clear, concise, and focus on practical usage with code examples highlighted in markdown format.
        """
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context information about Appliqué components:\n\n{context}\n\nQuestion: {query}"}
        ]
    )
    
    result = response.choices[0].message.content
    return result 