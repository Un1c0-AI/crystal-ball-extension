# Crystal Ball AI – Central Gateway (auto-discovers & mounts every gem)
# Runs on http://127.0.0.1:8000

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import importlib.util
import sys
from pathlib import Path
import uvicorn
import asyncio

app = FastAPI(
    title="Crystal Ball AI – Gem Gateway",
    description="Auto-discovered modular backend for the precognitive coding oracle",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


# ------------------------------------------------------------------
# AUTO-DISCOVERY OF ALL GEMS
# ------------------------------------------------------------------
GEMS_DIR = Path(__file__).parent.parent / "gems"


async def discover_and_mount_gems():
    if not GEMS_DIR.exists():
        print("gems/ directory not found – skipping auto-discovery")
        return

    for gem_path in GEMS_DIR.iterdir():
        if not gem_path.is_dir() or gem_path.name.startswith("_"):
            continue

        api_module_path = gem_path / "src" / "api.py"
        if not api_module_path.exists():
            print(f"{gem_path.name}: no src/api.py → skipped")
            continue

        gem_name = gem_path.name.replace("_", "-")  # clean name for URL

        # Dynamically import the api.py as a module
        spec = importlib.util.spec_from_file_location(f"{gem_name}_api", api_module_path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[f"{gem_name}_api"] = module
        spec.loader.exec_module(module)

        # Every gem MUST expose a FastAPI router at module.router
        if not hasattr(module, "router"):
            print(f"{gem_path.name}: no 'router' found in api.py → skipped")
            continue

        app.include_router(
            module.router,
            prefix=f"/{gem_name}",
            tags=[gem_name.replace("-", " ").title()],
        )
        print(f"Mounted gem: {gem_name} → /{gem_name}")


# ------------------------------------------------------------------
# HEALTH & ROOT
# ------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "healthy", "gems_loaded": len(app.routes)}

@app.get("/")
async def root():
    return {
        "message": "Crystal Ball AI is alive",
        "docs": "/docs",
        "gems": [route.path for route in app.routes if route.path.startswith("/") and "/" in route.path[1:]],
    }


# ------------------------------------------------------------------
# LIFESPAN – auto-mount gems on startup
# ------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    await discover_and_mount_gems()


# ------------------------------------------------------------------
# RUN (for dev)
# ------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,           # hot reload during dev
        log_level="info",
    )
