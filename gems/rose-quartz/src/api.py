from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Literal
import os
from .providers import ollama_stream, claude_stream, gemini_stream

router = APIRouter()

class ChatRequest(BaseModel):
	messages: list[dict]
	force_cloud: bool = False          # for debugging only
	model: Literal["auto", "claude", "gemini"] = "auto"

async def auto_choose_and_stream(req: ChatRequest):
	# === Intelligent routing logic ===
	total_tokens = sum(len(m["content"].split()) for m in req.messages)
	last_user_msg = next((m["content"] for m in reversed(req.messages) if m["role"] == "user"), "")

	# Always prefer local unless:
	# - User forces cloud
	# - Context > 60k tokens
	# - Message contains explicit complex reasoning keywords
	heavy_keywords = ["refactor", "architecture", "migrate", "10× faster", "security audit"]
	needs_cloud = (
		req.force_cloud
		or total_tokens > 60000
		or any(kw in last_user_msg.lower() for kw in heavy_keywords)
	)

	if needs_cloud and os.getenv("ANTHROPIC_API_KEY"):
		model_used = "claude-3-5-sonnet"
		async for token in claude_stream(req.messages):
			yield token
	elif needs_cloud and os.getenv("GEMINI_API_KEY"):
		model_used = "gemini-1.5-pro"
		async for token in gemini_stream(req.messages):
			yield token
	else:
		model_used = "deepseek-r1:8b (local)"
		async for token in ollama_stream(req.messages):
			yield token

	# Log usage (you can expand this later)
	print(f"Rose Quartz → {model_used} | {total_tokens} tokens")

@router.post("/run")
async def chat(req: ChatRequest):
	if req.model == "claude":
		gen = claude_stream(req.messages)
	elif req.model == "gemini":
		gen = gemini_stream(req.messages)
	else:
		gen = auto_choose_and_stream(req)

	return StreamingResponse(gen, media_type="text/event-stream")
# POST /rose-quartz/run endpoint
