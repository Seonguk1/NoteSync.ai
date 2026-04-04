# backend/app/services/ai/clients.py

from dotenv import load_dotenv
from google import genai
from groq import AsyncGroq

load_dotenv()

gemini_client = genai.Client().aio
groq_client = AsyncGroq()

# 가성비 우선
GEMINI_KEYWORD_MODEL = "gemini-2.5-flash-lite"
GEMINI_REFINE_MODEL = "gemini-2.5-flash-lite"

# STT
WHISPER_MODEL = "whisper-large-v3-turbo"