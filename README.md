# RAG Appliqué - Design System Documentation Assistant

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
2. **Query Processing** (`query.py`): Handles user queries, retrieves relevant documentation, and generates responses
3. **Application Entry Point** (`app.py`): Command-line interface to run ingestion or queries

## Prerequisites

- Python 3.8+
- Qdrant server running locally on port 6333
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install langchain-text-splitters langchain-openai langchain-qdrant openai bs4 selenium webdriver-manager python-dotenv
   ```
3. Install Qdrant server following [their installation guide](https://qdrant.tech/documentation/quick-start/)
4. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

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

