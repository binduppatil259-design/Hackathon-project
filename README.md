# AgriConnect 2.0 — Backend & Database

## Project Overview
AgriConnect 2.0 is a digital marketplace that connects farmers with buyers. Farmers can register and list produce, while buyers can view available produce.

## Technologies
- Python
- FastAPI
- Uvicorn
- SQLite

## Project Files
- `main.py` — Backend API endpoints and application logic
- `database.py` — Database connection and table creation
- `agriconnect.db` — SQLite database
- `requirements.txt` — Python package dependencies

## Setup on Mac

### 1. Open Terminal and enter the project folder
```bash
cd backend
```

### 2. Create a virtual environment
```bash
python3 -m venv .venv
```

### 3. Activate the environment
```bash
source .venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Start the backend
```bash
python -m uvicorn main:app --reload
```

## Open the API
- Home: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

## Important Notes
- Keep passwords, authentication tokens, and secret keys private.
- Do not commit the `.venv` folder to Git.
- The database file may contain test accounts and listings. Share it only if its contents are safe to share.
