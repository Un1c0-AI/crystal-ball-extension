from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

client = QdrantClient("http://localhost:6333")
COLLECTION = "crystal_ball_citrine"
model = SentenceTransformer("BAAI/bge-m3")

def retrieve(query: str, top_k: int = 20):
	query_vec = model.encode(query).tolist()
	hits = client.search(
		collection_name=COLLECTION,
		query_vector=query_vec,
		limit=top_k,
		with_payload=True,
	)
	return [
		{
			"text": hit.payload["text"],
			"file": hit.payload["file"],
			"score": hit.score,
		}
		for hit in hits
	]
# Hybrid search retriever
