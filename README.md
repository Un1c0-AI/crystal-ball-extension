# Crystal Ball AI 🔮

**The precognitive, self-evolving, 100% private coding oracle.**

## What Makes It Different

- **Precog Sandbox™** - Tests every change before touching your code
- **Self-Evolving** - Learns your style with personal LoRA training
- **100% Private** - Local DeepSeek-R1-8B, never phones home
- **Multi-LLM** - Intelligent routing (local-first, cloud when worth it)
- **Autonomous** - Completes complex features with proof

## Quick Start

```bash
# Install dependencies
npm install
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start backend
uvicorn app:app --port 8000

# In VS Code
Press F5 to launch extension
```

## Architecture

- **Frontend**: TypeScript VS Code extension
- **Backend**: Python FastAPI + LangGraph + Qdrant
- **LLM**: DeepSeek-R1-8B (local) with cloud fallback
- **Sandbox**: Git worktree + isolated test execution

## Commands

- `/precog` - Show predicted issues
- `/sandbox` - Run sandbox test
- `/try` - Write + prove a feature
- `/evolve` - Retrain your personal AI

## Status

Alpha - Building the future of coding AI.
