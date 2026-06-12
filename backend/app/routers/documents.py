from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentOut, RAGQuery, RAGResponse
from app.services.auth import get_current_user
from app.services.document import extract_text, save_upload, ALLOWED_TYPES
from app.services.rag import index_document, delete_document_chunks, answer_question

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("general"),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:  # 50 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    filename, path = await save_upload(file_bytes, file.content_type)
    text = extract_text(path, file.content_type)

    doc = Document(
        filename=filename,
        original_name=file.filename,
        category=category,
        description=description,
        file_size=len(file_bytes),
        file_type=file.content_type,
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    chunk_count = index_document(text, doc.id, file.filename, category)
    doc.chunk_count = chunk_count
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/", response_model=list[DocumentOut])
async def list_documents(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Document).order_by(Document.created_at.desc())
    if category:
        query = query.where(Document.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.uploaded_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    delete_document_chunks(doc.id)
    await db.delete(doc)
    await db.commit()


@router.post("/ask", response_model=RAGResponse)
async def ask(query: RAGQuery, _: User = Depends(get_current_user)):
    return await answer_question(query.question, query.category)
