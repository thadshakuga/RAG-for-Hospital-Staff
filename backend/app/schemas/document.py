from datetime import datetime
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: int
    original_name: str
    category: str
    description: str | None
    file_size: int
    file_type: str
    chunk_count: int
    created_at: datetime
    uploaded_by_id: int

    model_config = {"from_attributes": True}


class RAGQuery(BaseModel):
    question: str
    category: str | None = None  # filter by document category


class RAGResponse(BaseModel):
    answer: str
    sources: list[dict]
