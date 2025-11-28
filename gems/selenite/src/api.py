from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from langgraph.graph import StateGraph, END
from .state import AgentState
from .agent import plan_step, code_step, sandbox_step

router = APIRouter()

class RunRequest(BaseModel):
	objective: str
	max_iterations: int = 5

# Build the graph once
graph = StateGraph(AgentState)
graph.add_node("plan", plan_step)
graph.add_node("code", code_step)
graph.add_node("sandbox", sandbox_step)
graph.add_edge("plan", "code")
graph.add_edge("code", "sandbox")
graph.add_conditional_edges(
	"sandbox",
	lambda s: s["status"],
	{"done": END, "coding": "code", "failed": END}
)
graph.set_entry_point("plan")
app = graph.compile()

@router.post("/run")
async def autonomous_run(req: RunRequest, background_tasks: BackgroundTasks):
	initial_state: AgentState = {
	"objective": req.objective,
	"messages": [],
	"plan": [],
	"current_task": "",
	"code_diff": "",
	"sandbox_result": {},
	"iterations": 0,
	"max_iterations": req.max_iterations,
	"status": "planning"
	}
    
	# Run in background so API returns immediately
	background_tasks.add_task(run_agent, initial_state)
	return {"status": "started", "objective": req.objective}

async def run_agent(state: AgentState):
	result = await app.ainvoke(state)
	print("AUTONOMOUS AGENT FINISHED:", result["status"])
	print("Final diff:\n", result["code_diff"])
# POST /selenite/run endpoint
