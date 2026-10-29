# AgriConnect 2.0 — Farmer-to-Buyer Marketplace

AgriConnect is a digital marketplace designed to connect farmers directly with buyers, helping farmers showcase their produce and access market information.

## Features

- Farmer and buyer workflows
- Produce listings and marketplace interface
- FastAPI backend
- SQLite database integration
- Agricultural market-price lookup using the configured data source
- AI-powered agricultural assistance, where configured

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, FastAPI, Uvicorn
- **Database:** SQLite
- **Market data:** data.gov.in API integration

## Project Structure

- `AgriConnect2_Frontend/` — Frontend interface and JavaScript
- `backend/` — Backend modules, including market-price functionality
- `main.py` — FastAPI application and API routes
- `database.py` — Database connection and setup
- `requirements.txt` — Python dependencies
- `README_FULL_STACK.md` — Additional project documentation

## Setup on Windows

1. Open PowerShell in the project folder.
2. Create a virtual environment:

   ```powershell
   python -m venv .venv
   ```

3. Activate it:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

5. Configure required environment variables in your local `.env` file. Never commit API keys or secrets.
6. Start the backend using the command appropriate to your project configuration. For example:

   ```powershell
   uvicorn main:app --reload
   ```

7. Open `http://127.0.0.1:8000/docs` to inspect the API, if the server exposes FastAPI's documentation there.

## Team Collaboration

This repository is shared with the AgriConnect project collaborators. Please coordinate changes with the team and review changes before merging.

## Security

- Never commit API keys, passwords, tokens, or `.env` files.
- Keep virtual environments and local database files out of version control.
- Use real market data only when it is returned by the configured data source; do not fabricate prices.

## Project Status

This is a hackathon project under development. Features depend on the current implementation and configuration.
