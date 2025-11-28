from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    objective: str
    messages: List[dict]
    plan: List[str]
    current_task: str
    code_diff: str
    sandbox_result: dict
    iterations: int
    max_iterations: int
    status: str  # "planning" | "coding" | "sandbox" | "done" | "failed"
