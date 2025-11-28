#!/bin/bash
set -e

echo "🔮 Installing Crystal Ball AI..."

# Check dependencies
command -v python3 >/dev/null 2>&1 || { echo "Python 3 required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js required"; exit 1; }
command -v ollama >/dev/null 2>&1 || { echo "Ollama required - install from ollama.ai"; exit 1; }

# Install extension dependencies
echo "📦 Installing extension dependencies..."
npm install

# Setup Python backend
echo "🐍 Setting up Python backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

# Pull DeepSeek model
echo "🤖 Pulling DeepSeek-R1-8B model..."
ollama pull deepseek-r1:8b

# Optional: Start Qdrant
echo "🗄️  Starting Qdrant (optional)..."
if command -v docker >/dev/null 2>&1; then
    docker run -d --name crystal-qdrant -p 6333:6333 qdrant/qdrant || echo "Qdrant already running"
else
    echo "Docker not found - skipping Qdrant (memory features disabled)"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "To start:"
echo "  1. Terminal 1: cd backend && source .venv/bin/activate && python app.py"
echo "  2. Terminal 2 (VS Code): Press F5 to launch extension"
echo ""
echo "🔮 The crystal ball awaits..."
