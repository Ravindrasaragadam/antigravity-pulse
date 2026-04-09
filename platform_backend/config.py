import os
from dotenv import load_dotenv

load_dotenv()

# Telegram
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", 0))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_ALERT_CHAT_ID = int(os.getenv("TELEGRAM_ALERT_CHAT_ID", 0))
TELEGRAM_SESSION_NAME = os.getenv("TELEGRAM_SESSION_NAME", "session")
TELEGRAM_ALLOWED_CHATS = [int(x) for x in os.getenv("TELEGRAM_ALLOWED_CHAT_IDS", "").split(",") if x]

# AI
NVIDIA_NIM_API_KEY = os.getenv("NVIDIA_NIM_API_KEY", "")
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
NIM_MODEL = "meta/llama-3.2-11b-vision-instruct"

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# App Settings
INCLUDE_INTERNATIONAL = os.getenv("INCLUDE_INTERNATIONAL", "True").lower() == "true"
EVALUATION_INTERVAL_MINS = int(os.getenv("EVALUATION_INTERVAL_MINS", 30))

# Dynamic watchlist: if empty, will be populated based on focus areas and market trends
WATCHLIST_RAW = os.getenv("WATCHLIST_SYMBOLS", "")
if WATCHLIST_RAW.strip():
    WATCHLIST = [s.strip() for s in WATCHLIST_RAW.split(",") if s.strip()]
else:
    # Empty watchlist - will be populated dynamically by researcher based on:
    # 1. Focus keywords and related stocks
    # 2. Stocks with recent news mentions
    # 3. Stocks with significant price movements
    WATCHLIST = []

FOCUS_KEYWORDS = os.getenv("FOCUS_KEYWORDS", "")

# Market Hours (IST)
MARKET_OPEN = "09:15"
MARKET_CLOSE = "15:30"
