import os
from typing import AsyncGenerator

# Local – Ollama (DeepSeek-R1-8B)
async def ollama_stream(messages: list[dict], model: str = "deepseek-r1:8b") -> AsyncGenerator[str, None]:
    import httpx
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST",
            "http://localhost:11434/api/chat",
            json={"model": model, "messages": messages, "stream": True},
        ) as response:
            async for line in response.aiter_lines():
                if line.strip():
                    import json
                    chunk = json.loads(line)
                    if "message" in chunk:
                        yield chunk["message"]["content"]

# Cloud fallbacks
async def claude_stream(messages: list[dict]) -> AsyncGenerator[str, None]:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    async with client.messages.stream(
        model="claude-3-5-sonnet-20241022",
        max_tokens=8192,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text

async def gemini_stream(messages: list[dict]) -> AsyncGenerator[str, None]:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-1.5-pro-latest")
    chat = model.start_chat()
    response = await chat.send_message_async([m["content"] for m["role"] == "user" else m["content"] for m in messages], stream=True)
    async for chunk in response:
        yield chunk.text
