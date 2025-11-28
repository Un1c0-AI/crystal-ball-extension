from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import subprocess
from .core import Sandbox

router = APIRouter()

# In-memory store for active sandboxes (real implementation would use Redis, but this is perfect for dev)
_active_sandboxes = {}

class SandboxRequest(BaseModel):
	repo_path: str

class SandboxRunRequest(BaseModel):
	sandbox_id: str
	command: list[str]
	timeout: int = 60

@router.post("/run", response_model=dict)
async def create_and_run(request: SandboxRequest):
	try:
		sandbox = Sandbox(request.repo_path)
		path = sandbox.create()
		_active_sandboxes[sandbox.sandbox_id] = sandbox

		# Auto-detect test run
		test_result = sandbox.run_command(["pytest", "-q", "--tb=short"], timeout=90)

		return {
			"sandbox_id": sandbox.sandbox_id,
			"path": path,
			"test_result": test_result,
			"passed": test_result["success"],
		}
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))

@router.post("/command", response_model=dict)
async def run_command(req: SandboxRunRequest):
	sandbox = _active_sandboxes.get(req.sandbox_id)
	if not sandbox:
		raise HTTPException(404, "Sandbox not found")
	return sandbox.run_command(req.command, req.timeout)

@router.delete("/destroy/{sandbox_id}")
async def destroy(sandbox_id: str):
	sandbox = _active_sandboxes.pop(sandbox_id, None)
	if sandbox:
		sandbox.destroy()
		return {"status": "destroyed"}
	return {"status": "not found"}
# POST /clear-quartz/run endpoint
