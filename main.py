from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta, timezone 
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator  
from database import get_connection, create_tables
from pwdlib import PasswordHash
import os
from dotenv import load_dotenv
from openai import OpenAI
from backend.market_prices import router as market_prices_router
SECRET_KEY = "agriconnect-dev-secret-change-this-later"
ALGORITHM = "HS256"
security = HTTPBearer()
# Nebius AI configuration
load_dotenv(
    dotenv_path=os.path.join(
        os.path.dirname(__file__),
        "backend",
        ".env"
    )
)

NEBIUS_API_KEY = os.getenv("NEBIUS_API_KEY")

NEBIUS_BASE_URL = os.getenv(
    "NEBIUS_BASE_URL",
    "https://api.tokenfactory.nebius.com/v1"
)

NEBIUS_MODEL = os.getenv(
    "NEBIUS_MODEL",
    "nvidia/Nemotron-3_5-Lightning"
)
app = FastAPI(title="AgriConnect2.0 API")
app.include_router(market_prices_router)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
password_hash = PasswordHash.recommended()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload["sub"])
        role = payload["role"]

        return {
            "id": user_id,
            "role": role
        }

    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

@app.on_event("startup")
def startup():
    create_tables()

class ProduceCreate(BaseModel):
    farmer_id: int
    crop_name: str = Field(min_length=1)
    quantity_kg: float = Field(gt=0)
    quality: str = "Standard"
    price_per_kg: float = Field(gt=0)
    location: str = Field(min_length=1)

    @field_validator("crop_name", "location")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty or spaces")
        return value


class ProduceUpdate(BaseModel):
    crop_name: str = Field(min_length=1)
    quantity_kg: float = Field(gt=0)
    quality: str = "Standard"
    price_per_kg: float = Field(gt=0)
    location: str = Field(min_length=1)

    @field_validator("crop_name", "location")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty or spaces")
        return value
class UserCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)
    role: str
    location: str = Field(min_length=1, pattern=r".*\S.*")

class UserLogin(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=1)


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

@app.get("/")
def home():
    return {"message": "Welcome to AgriConnect2.0 backend!"}
@app.get("/health")
def health_check():
    return {"status": "backend is running"}
@app.post("/api/produce")
def create_produce(produce: ProduceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can create produce listings"
        )

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO produce_listings (farmer_id, crop_name, quantity, quality, price_per_unit, location)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (current_user["id"], produce.crop_name, produce.quantity_kg, produce.quality,
              produce.price_per_kg, produce.location))
        connection.commit()
        return {"message": "Produce listing saved successfully","id": cursor.lastrowid,}
    except Exception as error:
        connection.rollback()
        raise HTTPException(status_code=400, detail=str(error))
    finally:
        connection.close()

@app.get("/api/produce")
def get_produce(
    crop_name: str = None,
    location: str = None,
    max_price: float = None
):
    connection = get_connection()

    try:
        query = "SELECT * FROM produce_listings WHERE 1=1"
        params = []

        if crop_name:
            query += " AND crop_name LIKE ?"
            params.append("%" + crop_name.strip() + "%")

        if location:
            query += " AND location LIKE ?"
            params.append("%" + location.strip() + "%")

        if max_price is not None:
            query += " AND price_per_unit <= ?"
            params.append(max_price)

        query += " ORDER BY id DESC"

        rows = connection.execute(query, params).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()

@app.get("/api/produce/{produce_id}")
def get_produce_by_id(produce_id: int):
    connection = get_connection()

    try:
        row = connection.execute(
            "SELECT * FROM produce_listings WHERE id = ?",
            (produce_id,)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Produce listing not found"
            )

        return dict(row)

    finally:
        connection.close()

@app.post("/api/register")
def register_user(user: UserCreate):
    if user.role not in ("farmer", "buyer"):
        raise HTTPException(
            status_code=400,
            detail="Role must be farmer or buyer"
        )

    connection = get_connection()

    try:
        cursor = connection.cursor()

        hashed_password = password_hash.hash(user.password)

        cursor.execute("""
            INSERT INTO users (name, email, password_hash, role, location)
            VALUES (?, ?, ?, ?, ?)
        """, (
            user.name.strip(),
            user.email.strip().lower(),
            hashed_password,
            user.role,
            user.location.strip()
        ))

        connection.commit()

        return {
            "message": "Registration successful",
            "user_id": cursor.lastrowid,
            "role": user.role
        }

    except Exception as error:
        connection.rollback()

        if "UNIQUE constraint failed" in str(error):
            raise HTTPException(
                status_code=409,
                detail="Email is already registered"
            )

        raise HTTPException(
            status_code=400,
            detail="Registration failed"
        )

    finally:
        connection.close()

@app.post("/api/login")
def login_user(user: UserLogin):
    connection = get_connection()

    try:
        row = connection.execute(
            "SELECT id, name, email, password_hash, role, location "
            "FROM users WHERE email = ?",
            (user.email.strip().lower(),)
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not password_hash.verify(user.password, row["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token_payload = {
            "sub": str(row["id"]),
            "role": row["role"],
            "exp": datetime.now(timezone.utc) + timedelta(minutes=60)
        }

        token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)

        return {
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "role": row["role"],
                "location": row["location"]
            }
        }

    finally:  
        connection.close()

@app.put("/api/produce/{produce_id}")
def update_produce(
    produce_id: int,
    produce: ProduceUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can update produce listings"
        )

    connection = get_connection()

    try:
        existing = connection.execute(
            "SELECT * FROM produce_listings WHERE id = ?",
            (produce_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Produce listing not found"
            )

        if existing["farmer_id"] != current_user["id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only update your own listings"
            )

        connection.execute(
            """
            UPDATE produce_listings
            SET crop_name = ?,
                quantity = ?,
                quality = ?,
                price_per_unit = ?,
                location = ?
            WHERE id = ?
            """,
            (
                produce.crop_name,
                produce.quantity_kg,
                produce.quality,
                produce.price_per_kg,
                produce.location,
                produce_id
            )
        )

        connection.commit()

        return {
            "message": "Produce listing updated successfully",
            "id": produce_id
        }

    finally:
        connection.close()

@app.delete("/api/produce/{produce_id}")
def delete_produce(
    produce_id: int,
    current_user: dict = Depends(get_current_user)
):
    
    if current_user["role"] != "farmer":
        raise HTTPException(
            status_code=403,
            detail="Only farmers can delete produce listings"
        )

    connection = get_connection()

    try:
        existing = connection.execute(
            "SELECT * FROM produce_listings WHERE id = ?",
            (produce_id,)
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Produce listing not found"
            )

        if existing["farmer_id"] != current_user["id"]:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own listings"
            )

        connection.execute(
            "DELETE FROM produce_listings WHERE id = ?",
            (produce_id,)
        )
        connection.commit()

        return {
            "message": "Produce listing deleted successfully",
            "id": produce_id
        }

    finally:
        connection.close()

class MatchRequest(BaseModel):
    crop: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    marketScale: str = "all"

    @field_validator("crop")
    @classmethod
    def clean_crop(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Crop name cannot be empty")
        return value


@app.post("/api/matches")
def find_matches(
    request: MatchRequest,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "buyer":
        raise HTTPException(
            status_code=403,
            detail="Only buyers can request buyer matches"
        )

    connection = get_connection()

    try:
        rows = connection.execute(
            """
            SELECT
                id,
                farmer_id,
                crop_name,
                quantity,
                quality,
                price_per_unit,
                location
            FROM produce_listings
            WHERE LOWER(crop_name) LIKE ?
              AND quantity >= ?
            ORDER BY price_per_unit ASC
            """,
            (
                "%" + request.crop.lower() + "%",
                request.quantity
            )
        ).fetchall()

        matches = []

        for row in rows:
            item = dict(row)

            matches.append({
                "id": item["id"],
                "name": f"Farmer listing #{item['id']}",
                "crop": item["crop_name"],
                "demandQuantity": item["quantity"],
                "price": item["price_per_unit"],
                "distance": None,
                "location": item["location"],
                "quality": item["quality"],
                "reason": (
                    f"Crop matches {request.crop}. "
                    f"Available quantity: {item['quantity']} kg. "
                    f"Listed price: ₹{item['price_per_unit']}/kg. "
                    "Verify quality, location and delivery costs."
                )
            })

        return {
            "matches": matches,
            "count": len(matches),
            "message": (
                "Matching listings retrieved"
                if matches
                else "No matching listings found"
            )
        }

    finally:
        connection.close()

    


@app.post("/api/assistant/chat")
def assistant_chat(request: AssistantChatRequest):
    if not NEBIUS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Nebius API key is not configured."
        )

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    try:
        client = OpenAI(
            api_key=NEBIUS_API_KEY,
            base_url=NEBIUS_BASE_URL
        )

        response = client.chat.completions.create(
            model=NEBIUS_MODEL,
            messages=[
                {
                    "role": "system",
                    
"content": (
    "You are AgriConnect, an agricultural assistant for farmers. "
    "Return only the answer intended for the farmer. "
    "Never output chain-of-thought, internal reasoning, analysis, "
    "planning, mental rehearsal, drafts, or descriptions of how "
    "you formulate an answer. Do not include headings such as "
    "'Thinking Process', 'Analyze User Input', or 'Draft Response'. "
    "Use simple, concise, practical language. "
    "For crop diseases, ask about symptoms or request a photo "
    "when the disease is unclear. Give safe, evidence-based advice. "
    "Do not guess a diagnosis, invent pesticide doses, or recommend "
    "burning plants. Suggest local agricultural expert guidance "
    "when appropriate. Never invent live market prices."
)

                       
        
                },
                {
                    "role": "user",
                    "content": message
                }
            ],
                        max_tokens=600,
            extra_body={
                "chat_template_kwargs": {
                    "enable_thinking": False
                }
            }
        )

        answer = response.choices[0].message.content or ""
        answer = answer.strip()

        if not answer:
            answer = (
                "I'm here to help you with farming "
                "and selling your produce."
            )

        return {"answer": answer}

    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=502,
            detail="AI service failed. Check the backend terminal."
        )
