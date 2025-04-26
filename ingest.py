import os
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin, urlparse
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
from datetime import datetime
from langchain_core.documents import Document
from utils import extract_component_name, get_collection_name_for_component

# Load environment variables
load_dotenv()

# Function to extract all links from a given URL using Selenium
def extract_links(url, base_domain="applique.myntra.com", component_only=True):
    print(f"Fetching links from: {url}")
    print(f"Using base domain filter: {base_domain}")
    print(f"Component links only: {component_only}")
    
    try:
        # Set up Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Initialize the driver
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        
        # Navigate to the URL
        driver.get(url)
        
        # Wait for JavaScript to load
        time.sleep(3)
        
        # Get the page source after JavaScript execution
        page_source = driver.page_source
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(page_source, "html.parser")
        print(f"Page title: {soup.title.text if soup.title else 'No title'}")
        
        # Find all links
        all_found_links = []
        filtered_links = []
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            # Convert relative URLs to absolute
            full_url = urljoin(url, href)
            all_found_links.append(full_url)
            
            # Only include links from the same domain
            if base_domain in urlparse(full_url).netloc:
                # Check if component only is enabled
                if component_only:
                    # Only keep URLs that contain '/components/' in their path
                    if '/components/' in urlparse(full_url).path:
                        filtered_links.append(full_url)
                else:
                    filtered_links.append(full_url)
        
        # Close the driver
        driver.quit()
        
        print(f"Total links found: {len(all_found_links)}")
        print(f"Sample of all links found (first 5): {all_found_links[:5]}")
        
        # Print unique links for debugging
        unique_links = list(set(filtered_links))
        print(f"Found {len(unique_links)} unique component links")
        
        return unique_links
    except Exception as e:
        print(f"Error accessing URL: {str(e)}")
        return []

# Function to scrape component data from a URL using Selenium
def scrape_component_content(url):
    print(f"Scraping detailed content from: {url}")
    try:
        # Set up Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Initialize the driver
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        
        # Navigate to the URL
        driver.get(url)
        
        # Wait for JavaScript to load (increase time for more complex pages)
        time.sleep(5)
        
        # Get the page source after JavaScript execution
        page_source = driver.page_source
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(page_source, "html.parser")
        
        # Extract component name
        component_name = extract_component_name(url)
        
        # Extract main content
        main_content = soup.find('main')
        if not main_content:
            main_content = soup.find('body')
        
        # Extract specific sections (adjust selectors based on actual page structure)
        
        # Getting all text content
        full_text_content = main_content.get_text(separator=' ', strip=True) if main_content else ""
        
        # Try to extract code blocks
        code_blocks = []
        pre_tags = soup.find_all('pre')
        for pre in pre_tags:
            code_blocks.append(pre.get_text())
        
        # Try to extract API props (find tables or other structured content)
        api_sections = []
        tables = soup.find_all('table')
        for table in tables:
            api_sections.append(table.get_text(separator=' ', strip=True))
            
        # Get all images
        image_urls = []
        for img in soup.find_all('img'):
            src = img.get('src')
            if src:
                full_img_url = urljoin(url, src)
                image_urls.append(full_img_url)
        
        # Close the driver
        driver.quit()
        
        # Combine all content with clear section markers
        combined_content = f"""
Component: {component_name}
URL: {url}

DESCRIPTION:
{full_text_content[:2000]}  # Limiting to prevent very large documents

CODE EXAMPLES:
{' '.join(code_blocks)}

API PROPS:
{' '.join(api_sections)}

IMAGES:
{', '.join(image_urls)}
"""

        # Create and return langchain Document object with metadata
        return Document(
            page_content=combined_content,
            metadata={
                "component_name": component_name,
                "url": url,
                "has_code_examples": len(code_blocks) > 0,
                "has_api_props": len(api_sections) > 0,
                "has_images": len(image_urls) > 0,
                "scraped_at": datetime.now().isoformat()
            }
        )
    except Exception as e:
        print(f"Error scraping content from {url}: {str(e)}")
        return None

# Function to create a collection for a specific component
def create_component_collection(component_name, documents, embeddings):
    collection_name = get_collection_name_for_component(component_name)
    print(f"Creating collection '{collection_name}' for component: {component_name}")
    
    try:
        # Create vector store
        vector_store = QdrantVectorStore.from_documents(
            documents=documents,
            embedding=embeddings,
            url="http://localhost:6333",  # Use local Qdrant server
            collection_name=collection_name,
            force_recreate=True  # Recreate the collection if it already exists
        )
        print(f"Successfully created collection '{collection_name}'")
        return vector_store
    except Exception as e:
        print(f"Error creating collection for {component_name}: {str(e)}")
        return None

# Main ingestion function
def ingest_components(base_url="https://applique.myntra.com/components/accordion"):
    """
    Scrape and ingest component data from the design system into Qdrant
    
    Args:
        base_url: Starting URL for scraping component documentation
        
    Returns:
        A dictionary of component names and their corresponding vector stores
    """
    # Get all component links
    all_links = extract_links(base_url, component_only=True)
    print(f"Found {len(all_links)} component links")
    
    # Extract component names
    component_names = []
    for link in all_links:
        name = extract_component_name(link)
        if name:
            component_names.append(name)
    
    print(f"Extracted {len(component_names)} component names:")
    print(component_names)
    
    # Check if we have API keys
    if not os.getenv("OPEN_API_KEY"):
        print("OPEN_API_KEY not found in environment variables.")
        print("Skipping vector store creation.")
        return []
    
    # Create embeddings
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=os.getenv("OPEN_API_KEY")
    )
    
    # Create documents for each component and store in separate collections
    collections = {}
    
    # Process all components
    print("Processing all components and storing directly in Qdrant...")
    
    for link in all_links:
        component_name = extract_component_name(link)
        if component_name:
            # Scrape the component documentation
            document = scrape_component_content(link)
            if document:
                # Group documents by component
                if component_name not in collections:
                    collections[component_name] = []
                collections[component_name].append(document)
                print(f"Added document for {component_name}")
    
    # Create collections in Qdrant for each component
    vector_stores = {}
    print(f"Creating vector stores for {len(collections)} components")
    
    for component_name, docs in collections.items():
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        split_docs = text_splitter.split_documents(docs)
        print(f"Creating {len(split_docs)} chunks for component '{component_name}'")
        
        # Create collection
        vector_store = create_component_collection(component_name, split_docs, embeddings)
        if vector_store:
            vector_stores[component_name] = vector_store
    
    print(f"Successfully created {len(vector_stores)} component collections in Qdrant")
    return component_names

if __name__ == "__main__":
    ingest_components() 