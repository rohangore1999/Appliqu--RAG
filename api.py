from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from ingest import ingest_components
from query import process_query

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True) 