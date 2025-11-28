from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from .indexer import index_repo
from .retriever import retrieve

router = APIRouter()

class IndexRequest(BaseModel):
	repo_path: str

class QueryRequest(BaseModel):
	query: str
	top_k: int = 20

@router.post("/index")
async def index(req: IndexRequest, background_tasks: BackgroundTasks):
	background_tasks.add_task(index_repo, req.repo_path)
	return {"status": "indexing started", "repo": req.repo_path}

@router.post("/context")
async def context(req: QueryRequest):
	results = retrieve(req.query, req.top_k)
	return {
		"query": req.query,
		"results": results,
		"total": len(results)
	}
# GET /citrine/context endpoint
