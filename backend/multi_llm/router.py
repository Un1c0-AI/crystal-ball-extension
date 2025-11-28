"""
Multi-LLM Router - Intelligent provider selection
"""
from typing import Optional, AsyncGenerator
import httpx
import logging

logger = logging.getLogger(__name__)

class LLMRouter:
    """Routes requests to appropriate LLM provider"""
    
    def __init__(self):
        self.ollama_url = "http://127.0.0.1:11434"
        self.local_model = "deepseek-r1:8b"
    
    async def is_ollama_available(self) -> bool:
        """Check if Ollama is running"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.ollama_url}/api/tags", timeout=2.0)
                return response.status_code == 200
        except:
            return False
    
    async def stream_ollama(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream from local Ollama"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.local_model,
                        "prompt": prompt,
                        "stream": True
                    }
                ) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                import json
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done"):
                                    break
                            except:
                                continue
        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            yield f"Error: {str(e)}"
    
    async def route_request(self, prompt: str, prefer_local: bool = True) -> AsyncGenerator[str, None]:
        """
        Route request to best available LLM
        Default: Local-first strategy
        """
        if prefer_local and await self.is_ollama_available():
            logger.info("Routing to local Ollama")
            async for chunk in self.stream_ollama(prompt):
                yield chunk
        else:
            logger.warning("Ollama not available, would fallback to cloud (not implemented)")
            yield "Local LLM not available. Cloud providers coming soon."
