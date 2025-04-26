import os
import argparse
from dotenv import load_dotenv
from ingest import ingest_components
from query import process_query
from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from langchain_core.documents import Document
from openai import OpenAI

# Load environment variables
load_dotenv()

def direct_vector_search(query, collection_name, top_k=3):
    """
    Perform direct vector search on a Qdrant collection without routing
    
    Args:
        query: The user query string
        collection_name: The Qdrant collection to search
        top_k: Number of results to return
        
    Returns:
        List of search results and formatted response
    """
    # Check if we have API keys
    if not os.getenv("OPEN_API_KEY"):
        return "OPEN_API_KEY not found in environment variables. Cannot perform search."
    
    try:
        # Initialize Qdrant client
        client = QdrantClient(url="http://localhost:6333")
        
        # Check if collection exists
        if not client.collection_exists(collection_name):
            return f"Collection '{collection_name}' does not exist"
        
        # Initialize OpenAI embeddings
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=os.getenv("OPEN_API_KEY")
        )
        
        # Generate query embedding
        query_embedding = embeddings.embed_query(query)
        
        # Perform direct search against collection
        search_results = client.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=top_k
        )
        
        # Process results
        results = []
        for scored_point in search_results:
            payload = scored_point.payload
            score = scored_point.score
            
            # Convert to document for easier handling
            doc = Document(
                page_content=payload.get("page_content", ""),
                metadata={
                    **payload.get("metadata", {}),
                    "score": score
                }
            )
            results.append(doc)
        
        # Generate response with OpenAI
        if results:
            # Initialize OpenAI client
            openai_client = OpenAI(
                api_key=os.getenv("OPEN_API_KEY"),
            )
            
            # Build context from results
            context = "\n\n".join([doc.page_content for doc in results])
            
            # System prompt
            system_prompt = """
            You are a helpful assistant that provides information about Myntra's Appliqué Design System components.
            Use the provided context to answer questions accurately and include the following in your response:
            
            1. Brief explanation of the component and its purpose
            2. Key features and variations
            3. ALWAYS include practical code examples showing how to use the component (if available in the context)
            4. Any important props or API details
            
            Your response should be clear, concise, and focus on practical usage with code examples highlighted in markdown format.
            """
            
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Context information about Appliqué components:\n\n{context}\n\nQuestion: {query}"}
                ]
            )
            
            ai_response = response.choices[0].message.content
            
            # Print raw results
            print("\nDirect Vector Search Results:")
            for i, doc in enumerate(results):
                print(f"\nResult {i+1} (Score: {doc.metadata.get('score'):.4f})")
                print(f"Component: {doc.metadata.get('component_name', 'Unknown')}")
                print(f"URL: {doc.metadata.get('url', 'Unknown')}")
                print(f"Content preview: {doc.page_content[:150]}...")
            
            return ai_response
        else:
            return "No results found for your query in the specified collection."
    
    except Exception as e:
        return f"Error performing direct vector search: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description="RAG application for Appliqué Design System")
    parser.add_argument("--ingest", action="store_true", help="Run the data ingestion process")
    parser.add_argument("--query", type=str, help="Query to process with intelligent routing")
    args = parser.parse_args()
    
    # Check if we have API keys
    if not os.getenv("OPEN_API_KEY"):
        print("OPEN_API_KEY not found in environment variables.")
        return
    
    # Store component names in a file for persistence between runs
    component_names_file = "component_names.txt"
    
    if args.ingest:
        # Run ingestion
        print("Starting data ingestion process...")
        component_names = ingest_components()
        
        # Save component names to file
        with open(component_names_file, "w") as f:
            f.write("\n".join(component_names))
        print(f"Component names saved to {component_names_file}")
        
    elif args.query:
        # Load component names from file
        try:
            with open(component_names_file, "r") as f:
                component_names = [line.strip() for line in f.readlines()]
        except FileNotFoundError:
            print(f"Component names file not found. Please run with --ingest first.")
            return
        
        # Process query
        print(f"\nProcessing query: {args.query}")
        result = process_query(args.query, component_names)
        print("\nRAG Response:")
        print(result)
    
    else:
        print("Please specify one of the following options:")
        print("  --ingest to populate the database")
        print("  --query \"Your question\" to ask a question with intelligent routing")
        print("\nExamples:")
        print("  python app.py --ingest")
        print("  python app.py --query \"How do I create a modal dialog in Appliqué?\"")

if __name__ == "__main__":
    main()