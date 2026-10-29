import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlencode

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query

load_dotenv(Path(__file__).resolve().parent / ".env")

router = APIRouter(prefix="/api", tags=["Market Prices"])

API_KEY = os.getenv("DATA_GOV_API_KEY")

API_URL = (
    "https://api.data.gov.in/resource/"
    "9ef84268-d588-465a-a308-a864a43d0070"
)


def fetch_market_data(params: dict) -> dict:
    """Fetch Mandi data using Windows curl without exposing the key in logs."""
    url = API_URL + "?" + urlencode(params)

    # The configuration and API key are passed through stdin,
    # not as command-line arguments.
    config = (
        f'url = "{url}"\n'
        "silent\n"
        "show-error\n"
        "max-time = 25\n"
        'write-out = "\\n__HTTP_STATUS__:%{http_code}"\n'
    )

    try:
        result = subprocess.run(
            ["curl.exe", "--config", "-"],
            input=config,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=502,
            detail="Windows curl.exe was not found.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(
            status_code=504,
            detail="The Mandi provider timed out.",
        ) from exc

    output = result.stdout
    marker = "\n__HTTP_STATUS__:"

    if marker not in output:
        # Do not print the request URL because it contains the API key.
        print("Mandi curl failed. Exit code:", result.returncode)
        print("Mandi curl error:", result.stderr[:300])
        raise HTTPException(
            status_code=502,
            detail="Mandi provider returned no HTTP status. Check server logs.",
        )

    body, status_text = output.rsplit(marker, 1)

    try:
        status_code = int(status_text.strip())
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not read the Mandi provider status.",
        ) from exc

    if result.returncode != 0 or not 200 <= status_code < 300:
        print("Mandi provider HTTP status:", status_code)
        print("Mandi provider response:", body[:300])
        raise HTTPException(
            status_code=502,
            detail=f"Mandi provider returned HTTP {status_code}.",
        )

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="Mandi provider returned invalid JSON.",
        ) from exc


@router.get("/market-prices")
def get_market_prices(
    state: str | None = None,
    district: str | None = None,
    commodity: str = Query(default="Tomato"),
    limit: int = Query(default=20, ge=1, le=100),
):
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="DATA_GOV_API_KEY is missing from backend/.env.",
        )

    params = {
        "api-key": API_KEY,
        "format": "json",
        "offset": 0,
        "limit": limit,
        "filters[commodity]": commodity,
    }

    if state:
        params["filters[state.keyword]"] = state

    

    data = fetch_market_data(params)
    records = data.get("records", [])
    if district:
     records = [
        record
        for record in records
        if record.get("district", "").strip().casefold()
        == district.strip().casefold()
    ]

    return {
        "source": "data.gov.in",
        "commodity": commodity,
        "count": len(records),
        "prices": records,
    }