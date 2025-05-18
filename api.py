from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from ingest import ingest_components
from query import process_query
from openai import OpenAI

load_dotenv()

app = Flask(__name__)

COMPONENT_NAMES_FILE = "component_names.txt"

@app.route("/ingest", methods=["POST"])
def ingest():
    if not os.getenv("OPEN_API_KEY"):
        return jsonify({"error": "OPEN_API_KEY not found in environment variables."}), 400
    try:
        component_names = ingest_components()
        with open(COMPONENT_NAMES_FILE, "w") as f:
            f.write("\n".join(component_names))
        return jsonify({"message": "Ingestion complete.", "component_names": component_names})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/query", methods=["POST"])
def query():
    if not os.getenv("OPEN_API_KEY"):
        return jsonify({"error": "OPEN_API_KEY not found in environment variables."}), 400
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' in request body."}), 400
    try:
        with open(COMPONENT_NAMES_FILE, "r") as f:
            component_names = [line.strip() for line in f.readlines()]
    except FileNotFoundError:
        return jsonify({"error": "Component names file not found. Please run /ingest first."}), 400
    try:
        result = process_query(data["query"], component_names)
        return jsonify({"response": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/describe-image", methods=["POST"])
def describe_image():
    """
    Route to describe an image using OpenAI's Vision API
    
    Expects a POST request with JSON body containing:
    {
        "image_url": "data:image/jpeg;base64,..."
    }
    """
    if not os.getenv("OPEN_API_KEY"):
        return jsonify({"error": "OPEN_API_KEY not found in environment variables."}), 400
    
    data = request.get_json()
    print(f"Received data: {data}")  # Debugging line to check incoming data

    if not data or "image_url" not in data:
        return jsonify({"error": "Missing 'image_url' in request body."}), 400
    
    try:
        # Initialize OpenAI client similar to your example code
        openai_client = OpenAI(
            api_key=os.getenv("OPEN_API_KEY")
        )
        
        # Base64 image URL should already be in format: data:image/jpeg;base64,...
        base64_image_url = data["image_url"]

        print(f"Received image URL: {base64_image_url[:30]}...")  # Print first 30 chars for debugging
        
        # Create system prompt
        system_prompt = """
        You are an AI assistant which will visualize the image of seller's data and describe it in detail.
        - Understand the image in detail and figure out the content is table, graph, maps etc.
        - Perform the analytics of the image and provide the details.
        - Just give the final summary of the data in simple layman's term.
        """
        
        print("Calling openai")

        # Call OpenAI API using the client pattern from your example
        response = openai_client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user", 
                    "content": [
                        {"type": "text", "text": "Please describe this image in detail."},
                        {"type": "image_url", "image_url": {"url": base64_image_url}}
                    ]
                }
            ],
            max_tokens=300
        )
        
        
        # Extract the description from the response
        description = response.choices[0].message.content

        print("Response received from OpenAI", description)
        
        return jsonify({
            "success": True,
            "description": description
        })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True) 