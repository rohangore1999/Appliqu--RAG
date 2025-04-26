import os
import re
from urllib.parse import urljoin, urlparse
from datetime import datetime
from langchain_core.documents import Document

# Function to extract component name from URL
def extract_component_name(url):
    # Parse the URL
    parsed_url = urlparse(url)
    # Get the path
    path = parsed_url.path
    # Extract component name - the part after '/components/'
    match = re.search(r'/components/([^/]+)', path)
    if match:
        return match.group(1)
    return None

# Function to determine which collection to use for a component
def get_collection_name_for_component(component_name):
    # Simple approach: use the component name directly as collection name
    # Replace dashes with underscores for better compatibility
    collection_name = f"applique_{component_name.replace('-', '_')}"
    return collection_name 