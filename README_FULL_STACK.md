# AgriConnect 2.0 — Combined Frontend + Backend

This ZIP combines the supplied frontend and FastAPI/SQLite backend.

## Folder structure
- `AgriConnect2_Frontend/` — HTML, CSS and JavaScript UI
- `main.py` — FastAPI backend
- `database.py` — SQLite database/table setup
- `agriconnect.db` — supplied database file (may contain test data)
- `requirements.txt` — Python dependencies

## Run the backend
Install Python 3.10+ and open a terminal in this extracted folder:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check `http://127.0.0.1:8000/health` and open API docs at `http://127.0.0.1:8000/docs`.

## Run the frontend
Serve the `AgriConnect2_Frontend` folder with a static web server, with the backend running on port 8000. The frontend configuration is in `AgriConnect2_Frontend/config.js` and currently uses `http://localhost:8000`.

Important: if you open the frontend on a different device (for example, your phone) or deploy it online, change `API_BASE_URL` to the backend's reachable URL. `localhost` means the device itself, not your computer/server.

## Integration status
- Frontend login/register requests have been aligned to the backend's `/api/login` and `/api/register` routes.
- CORS is enabled for development.
- The backend currently implements authentication and core produce-listing routes. Several advanced frontend screens call endpoints (such as buyer demands, market prices, matching, aggregation, assistant and order workflows) that are **not implemented in the supplied backend yet**. Those screens will not become fully data-connected until the missing API endpoints are added.
- For local demo use only. Before public deployment, restrict CORS, replace the development JWT secret in `main.py`, and review authentication, database and security settings.
