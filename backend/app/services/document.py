import os
import uuid
import aiofiles
from pathlib import Path
from pypdf import PdfReader
from docx import Document as DocxDocument
from app.config import settings


ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
}


def extract_text(file_path: str, content_type: str) -> str:
    if content_type == "application/pdf":
        reader = PdfReader(file_path)
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = DocxDocument(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()


async def save_upload(file_bytes: bytes, content_type: str) -> tuple[str, str]:
    ext = ALLOWED_TYPES.get(content_type, ".bin")
    filename = f"{uuid.uuid4()}{ext}"
    path = Path(settings.upload_dir) / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(path, "wb") as f:
        await f.write(file_bytes)
    return filename, str(path)
