
import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
AI_MODEL = "llama3.2:3b"


def generate_ai_response(prompt):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": AI_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()

    except requests.exceptions.ConnectionError:
        return "AI service is unavailable. Please ensure Ollama is running."

    except requests.exceptions.Timeout:
        return "AI request timed out. Please try again."

    except requests.exceptions.RequestException as error:
        return f"AI service error: {str(error)}"


def classify_ticket(title, description):
    prompt = f"""
    You are an expert IT HelpDesk ticket classifier.

    Analyze this support ticket.

    Title: {title}
    Description: {description}

    Select one category:
    HARDWARE, SOFTWARE, NETWORK, ACCOUNT or OTHER.

    Select one priority:
    LOW, MEDIUM, HIGH or CRITICAL.

    Return only valid JSON:
    {{
        "category": "NETWORK",
        "priority": "HIGH"
    }}
    """

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": AI_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=120
        )

        response.raise_for_status()

        ai_data = json.loads(
            response.json().get("response", "{}")
        )

        category = str(ai_data.get("category", "")).upper()
        priority = str(ai_data.get("priority", "")).upper()

        valid_categories = [
            "HARDWARE", "SOFTWARE", "NETWORK", "ACCOUNT", "OTHER"
        ]

        valid_priorities = [
            "LOW", "MEDIUM", "HIGH", "CRITICAL"
        ]

        if category not in valid_categories:
            return None

        if priority not in valid_priorities:
            return None

        return {
            "category": category,
            "priority": priority
        }

    except (
        requests.exceptions.RequestException,
        ValueError,
        TypeError,
        AttributeError
    ):
        return None
