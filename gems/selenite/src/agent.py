
import httpx
import json
from .state import AgentState

API = "http://127.0.0.1:8000"

async def plan_step(state: AgentState) -> AgentState:
	prompt = f"""You are an autonomous senior engineer.
Objective: {state["objective"]}

Break this down into 3–8 concrete, testable steps.
Respond with a JSON array of strings only."""
    
	resp = await httpx.post(f"{API}/rose-quartz/run", json={
		"messages": [{"role": "user", "content": prompt}]
	}, timeout=120)
	state["plan"] = json.loads(resp.text)
	state["current_task"] = state["plan"][0]
	state["status"] = "coding"
	return state

async def code_step(state: AgentState) -> AgentState:
	context = await httpx.post(f"{API}/citrine/context", json={"query": state["current_task"], "top_k": 15})
	context_text = "\n".join([f"// {r['file']}:\n{r['text']}" for r in context.json()["results"]])

	prompt = f"""Current task: {state["current_task"]}

Relevant code from repo:
{context_text}

Write ONLY the diff (unified format) that completes this task.
Preserve style. Add tests if missing.
Output ONLY the diff, no explanation."""

	resp = await httpx.post(f"{API}/rose-quartz/run", json={
		"messages": [{"role": "user", "content": prompt}]
	}, timeout=180)
	state["code_diff"] = resp.text.strip()
	state["status"] = "sandbox"
	return state

async def sandbox_step(state: AgentState) -> AgentState:
	repo_path = "/absolute/path/to/your/repo"  # will be injected from VS Code later
	sandbox_resp = await httpx.post(f"{API}/clear-quartz/run", json={
		"repo_path": repo_path
	})
	result = sandbox_resp.json()
    
	if result["passed"]:
		state["status"] = "done"
	else:
		state["iterations"] += 1
		if state["iterations"] >= state["max_iterations"]:
			state["status"] = "failed"
		else:
			state["status"] = "coding"  # try again
	state["sandbox_result"] = result
	return state
