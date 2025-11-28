from pathlib import Path
from git import Repo
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
import tree_sitter_languages
import hashlib
from tqdm import tqdm
import re

client = QdrantClient("http://localhost:6333")
COLLECTION = "crystal_ball_citrine"
model = SentenceTransformer("BAAI/bge-m3")

def get_language_parser(file_path: Path):
	ext = file_path.suffix.lower()
	lang_map = {".py": "python", ".js": "javascript", ".ts": "typescript", ".rs": "rust"}
	lang = lang_map.get(ext)
	if not lang:
		return None
	return tree_sitter_languages.get_parser(lang)

def extract_functions(content: str, parser) -> list[str]:
	if not parser:
		return [content]
	tree = parser.parse(content.encode())
	# Simple placeholder – real version walks AST for def/class
	funcs = re.findall(r"^(?:def|class|async def)\s+(\w+)", content, re.MULTILINE)
	return funcs or [content[:1000]]

def index_repo(repo_path: str):
	repo = Repo(repo_path)
	path = Path(repo_path)

	client.recreate_collection(
		collection_name=COLLECTION,
		vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
	)

	points = []
	for file_path in tqdm(list(path.rglob("*.*"))):
		if file_path.is_dir() and not any(part.startswith(".") for part in file_path.parts):
			try:
				content = file_path.read_text(encoding="utf-8", errors="ignore")
				parser = get_language_parser(file_path)
				chunks = extract_functions(content, parser)

				for i, chunk in enumerate(chunks):
					embedding = model.encode(chunk).tolist()
					point_id = hashlib.md5(f"{file_path}:{i}".encode()).hexdigest()
					points.append(PointStruct(
						id=point_id,
						vector=embedding,
						payload={
							"text": chunk,
							"file": str(file_path.relative_to(path)),
							"commit": repo.head.commit.hexsha,
							"author": str(repo.head.commit.author),
						}
					))
			except Exception:
				continue

	client.upsert(collection_name=COLLECTION, points=points)
	print(f"Citrine indexed {len(points)} chunks")
# Workspace indexer
