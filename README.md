# RAG Appliqué - Design System Documentation Assistant

Component Desgin System Link ~ https://applique.myntra.com/components/accordion 

A Retrieval-Augmented Generation (RAG) system for Myntra's Appliqué Design System documentation, providing intelligent answers about UI components.

## Overview

This project creates a virtual assistant that can answer queries about the Appliqué Design System components by:

1. **Scraping documentation**: Automatically extracts content from the Appliqué documentation website
2. **Processing content**: Organizes content by component and creates semantic embeddings
3. **Storing in vector database**: Uses Qdrant to store and retrieve component documentation
4. **Intelligent retrieval**: Routes queries to the most relevant component collections
5. **Generating responses**: Uses OpenAI's API to create natural language responses with code examples

## System Architecture

The system is divided into three main modules:

1. **Data Ingestion** (`ingest.py`): Scrapes the Appliqué documentation website, processes content, and stores in Qdrant

   - Web Scraping:
      - Uses Selenium (headless Chrome) to load documentation pages with JavaScript
      - Extracts component links from the Appliqué design system site
      - Scrapes detailed content from each component page including descriptions, code examples, API properties, and images
      
   - Content Processing:
      - Extracts component names from URLs
      - Organizes scraped content into structured documents
      - Adds metadata like URLs, timestamps, and content indicators

   - Text Chunking:
      - Splits long documents into smaller chunks (1000 characters with 200 character overlap)
      - Ensures chunks are appropriate size for embedding and retrieval

   - Vector Database Creation:
      - Creates a separate Qdrant collection for each component
      - Converts text chunks to embeddings using OpenAI's embedding model
      - Stores these vector embeddings in Qdrant for semantic search

   - Organization:
      - Maintains separate collections per component for targeted searching
      - Returns component names for the main app to save for future queries

   This is the "ingestion" part of the RAG system that builds the knowledge base for later retrieval.


2. **Query Processing** (`query.py`): Handles user queries, retrieves relevant documentation, and generates responses

   - Query Routing System:
      - Uses GPT-3.5 to analyze user questions and determine which component collections to search
      - Takes a user query like "How do I create a modal?" and routes it to the relevant components ("modal")
      - Returns collection names to search based on the query's intent

   - Vector Similarity Search:
      - Connects directly to Qdrant database for efficient vector searching
      - Converts user queries to embeddings using OpenAI's embedding model
      - Performs semantic search to find documentation chunks most relevant to the query
      - Returns top matching documents from each relevant collection

   - Multi-Collection Searching:
      - Searches across multiple component collections when a query might involve multiple components
      - Aggregates results from all collections
      - Takes the most relevant results for context building

   - Answer Generation:
      - Combines top search results into a cohesive context string
      - Uses GPT-3.5 with a specialized system prompt that emphasizes practical examples
      - Constructs comprehensive answers with component explanations, features, code examples, and API details
      - Formats responses with markdown for better readability


3. **Application Entry Point** (`app.py`): Command-line interface to run ingestion or queries

   - Configuration and Setup:
      - Imports necessary modules and loads environment variables
      - Defines command-line interface with argparse
      - Checks for required API keys

   - Direct Vector Search Function:
      - Implements a function to search directly in a specific component collection
      - Connects to Qdrant, generates embeddings for the query
      - Retrieves relevant documents and ranks them by similarity score
      - Formats search results for debugging output

   - Response Generation:
      - Takes retrieved context and constructs a prompt for OpenAI
      - Uses a specialized system prompt that structures responses with:
         - Component explanations
         - Key features
         - Code examples (prioritized)
         - API details

   - Main Application Flow Control:
      - Handles the --ingest mode by calling functions from ingest.py
      - Handles the --query mode by calling functions from query.py
      - Maintains a file to store component names between runs
      - Provides helpful usage information when run without arguments

4. **Utils** (`utils.py`): Contains utility functions for the project
   - Component Name Extraction:
      - extract_component_name(url) extracts the component name from URLs
      - Uses regex to find the part after '/components/' in the URL path
      - Example: from "https://applique.myntra.com/components/button" it extracts "button"

   - Collection Name Formatting:
      - get_collection_name_for_component(component_name) creates standardized collection names
      - Prefixes all collections with "applique_" for consistency
      - Replaces dashes with underscores for database compatibility
      - Example: "modal-dialog" becomes "applique_modal_dialog"


## Usage

### Data Ingestion

To scrape and ingest the Appliqué documentation:

```
python app.py --ingest
```

This will:

1. Visit the Appliqué documentation site
2. Extract all component pages
3. Process and store content in Qdrant collections
4. Save component names to a file for later use

### Querying the System

To ask a question about Appliqué components:

```
python app.py --query "How do I create a modal dialog in Appliqué?"
```

The system will:

1. Determine which components are relevant to the query
2. Retrieve documentation from those component collections
3. Generate a contextually relevant response with code examples

## How It Works

### Data Ingestion Process

1. **Web Scraping**: Uses Selenium to scrape dynamic content from the Appliqué documentation
2. **Content Extraction**: Extracts descriptions, code examples, API props, and images
3. **Document Processing**: Creates structured documents for each component
4. **Text Chunking**: Splits documents into manageable chunks
5. **Embedding Generation**: Creates vector embeddings using OpenAI's embedding model
6. **Storage**: Stores embeddings and metadata in Qdrant collections

### Query Processing

1. **Query Routing**: Uses LLM to determine which components are relevant to the query
2. **Vector Search**: Retrieves the most similar chunks from relevant collections
3. **Context Building**: Combines retrieved content to create a rich context
4. **Response Generation**: Uses OpenAI to create a natural language response with code examples

## Customization

- Modify the base URL in `ingest.py` to scrape different documentation sites
- Adjust the chunk size and overlap in `ingest.py` to optimize retrieval
- Update the system prompt in `query.py` to change the response format

## Example Queries

### Example 1:
```
➜ python app.py --query "How do I use <Layout> component in Appliqué?" 
```

```
Processing query: How do I use <Layout> component in Appliqué?
Query routed to collections: ['applique_layout']
Found 2 results in collection 'applique_layout'

Query: How do I use <Layout> component in Appliqué?

Top results:

1. Component: layout
   URL: https://applique.myntra.com/components/layout
   Content preview: Component: layout
URL: https://applique.myntra.com/components/layout...

2. Component: layout
   URL: https://applique.myntra.com/components/layout
   Content preview: </Layout>
)
 return (
  <Layout type="row">
    <div style={{ padding: '16px', border: '1px solid' }}>One</div>
    <div style={{ padding: '16px', bor...

RAG Response:
1. **Brief explanation:** The `<Layout>` component in Myntra's Appliqué Design System is used to manage the arrangement and spacing of elements on a webpage. It helps in creating responsive layouts by providing flexibility in positioning different UI components.

2. **Key features and variations:**
   - The `type` prop defines the layout direction and can be set to "row" for a horizontal layout or "column" for a vertical layout.
   - The `spacing` prop can be used to set the spacing between the child elements.
   - The `<Layout>` component supports responsive design, making it easy to create layouts that adapt to different screen sizes.
  
3. **Code example:**
```jsx
import React from 'react';
import Layout from 'applique/components/layout';

const MyComponent = () => {
  return (
    <Layout type="row" spacing={16}>
      <div style={{ padding: '16px', border: '1px solid' }}>One</div>
      <div style={{ padding: '16px', border: '1px solid' }}>Two</div>
      <div style={{ padding: '16px', border: '1px solid' }}>Three</div>
      <div style={{ padding: '16px', border: '1px solid' }}>Four</div>
    </Layout>
  );
};

export default MyComponent;

4. **Important props or API details:**
   - `type`: Specifies the layout direction ("row" or "column").
   - `spacing`: Sets the spacing between child elements.

By using the `<Layout>` component and adjusting its props, you can easily create structured and visually appealing layouts in your web application.
```


### Example 2:
```
➜ python app.py --query "How do I use Layout with progress bar"       
```

```
Processing query: How do I use Layout with progress bar
Query routed to collections: ['applique_layout', 'applique_progress']
Found 2 results in collection 'applique_layout'
Found 2 results in collection 'applique_progress'

Query: How do I use Layout with progress bar

Top results:

1. Component: layout
   URL: https://applique.myntra.com/components/layout
   Content preview: accordion avatar badge banner bread crumb buttons button button group click away dropdown dropdowns input select input date input month error boundary...

2. Component: layout
   URL: https://applique.myntra.com/components/layout
   Content preview: </Layout>
)
 return (
  <Layout type="row">
    <div style={{ padding: '16px', border: '1px solid' }}>One</div>
    <div style={{ padding: '16px', bor...

RAG Response:
### Layout Component
The Layout component in Myntra's Appliqué Design System allows you to structure your UI elements in a flexible and responsive way. It helps in arranging different components and controlling the layout effectively.

#### Key Features:
- Supports types like "stack" and "row" to define the layout orientation.
- Allows setting relative spacing between elements using the `space` prop.
- Facilitates arranging elements horizontally or vertically as per the type specified.

#### Practical Code Example:
To use Layout with a progress bar, you can structure your components inside a Layout component with a type that suits your design.

```jsx
import React from 'react';
import { Layout, Progress } from 'applique';

const ProgressBarLayout = () => {
  return (
    <Layout type="stack" space={[1, 2, 1]}>
      <Progress value={25} /> {/* Assuming the value is 25% */}
      <Progress value={50} /> {/* Progress at 50% */}
      <Progress value={75} /> {/* Progress at 75% */}
    </Layout>
  );
};

export default ProgressBarLayout;

In the code above, a stack Layout is used to vertically arrange Progress components, each showing different progress values.

#### Important API Details:
- `type`: Specifies the layout direction ("stack" or "row").
- `space`: Accepts an array to define relative spacing between elements.

By utilizing the Layout component with Progress components, you can create a structured and visually appealing layout for displaying progress bars in your application.
```