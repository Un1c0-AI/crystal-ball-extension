from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Crystal Ball AI Backend",
    version="0.1.0",
    description="Precognitive coding oracle backend"
)

# CORS for VS Code extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: bool = True

class HealthResponse(BaseModel):
    status: str
    modules: dict

# Health check
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - verifies all modules"""
    modules_status = {
        "core": True,
        "ollama": await check_ollama(),
        "sandbox": False,  # TODO: Implement
        "memory": False,   # TODO: Implement
        "evolution": False # TODO: Implement
    }
    
    return HealthResponse(
        status="healthy" if modules_status["core"] else "degraded",
        modules=modules_status
    )

async def check_ollama() -> bool:
    """Check if Ollama is available"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get("http://127.0.0.1:11434/api/tags", timeout=2.0)
            return response.status_code == 200
    except Exception as e:
        logger.warning(f"Ollama not available: {e}")
        return False

# Chat endpoint
@app.post("/v1/chat")
async def chat(request: ChatRequest):
    """Main chat endpoint - routes to appropriate LLM"""
    try:
        # TODO: Implement full agent logic
        # For now, return a simple response
        return {
            "status": "success",
            "message": "Backend chat endpoint ready - full agent coming soon"
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Agent endpoint (future)
@app.post("/v1/agent")
async def agent_execute(request: ChatRequest):
    """Autonomous agent endpoint with sandbox verification"""
    # TODO: Implement LangGraph agent
    return {
        "status": "success",
        "message": "Agent endpoint ready - implementation coming soon"
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("🔮 Starting Crystal Ball AI Backend...")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
