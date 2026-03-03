from dotenv import load_dotenv
import os

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

# ── JWT Authentication ────────────────────────────────────────────────────────
# SECRET_KEY is mandatory — the app will fail fast if it's missing.
SECRET_KEY: str = os.getenv("SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

# Token lifespan in minutes (default: 10 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10"))
