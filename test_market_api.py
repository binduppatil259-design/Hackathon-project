
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / "backend" / ".env")

api_key = os.getenv("DATA_GOV_API_KEY")

if not api_key:
    print("API key was not loaded from backend/.env")
else:
    url = (
        "https://api.data.gov.in/resource/"
        "9ef84268-d588-465a-a308-a864a43d0070"
    )

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 1,
        "filters[commodity]": "Tomato",
    }

    try:
        response = httpx.get(
            url,
            params=params,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )
        print("HTTP status:", response.status_code)
        print("Response preview:", response.text[:300])

    except httpx.TimeoutException:
        print("The dataset request timed out.")
    except httpx.RequestError as exc:
        print("Connection error type:", type(exc).__name__)
