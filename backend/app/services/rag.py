from langchain_anthropic import ChatAnthropic
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document as LCDocument
from app.config import settings

_embeddings = None
_vectorstore = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings


def get_vectorstore():
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = Chroma(
            persist_directory=settings.chroma_persist_dir,
            embedding_function=get_embeddings(),
        )
    return _vectorstore


def index_document(text: str, doc_id: int, filename: str, category: str) -> int:
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    chunks = splitter.split_text(text)
    docs = [
        LCDocument(
            page_content=chunk,
            metadata={"doc_id": doc_id, "filename": filename, "category": category},
        )
        for chunk in chunks
    ]
    vs = get_vectorstore()
    vs.add_documents(docs)
    return len(chunks)


def delete_document_chunks(doc_id: int):
    vs = get_vectorstore()
    vs.delete(where={"doc_id": doc_id})


async def answer_question(question: str, category: str | None = None) -> dict:
    vs = get_vectorstore()
    where = {"category": category} if category else None
    results = vs.similarity_search_with_score(question, k=5, filter=where)

    if not results:
        return {"answer": "No relevant documents found. Please upload hospital documents first.", "sources": []}

    context = "\n\n---\n\n".join(doc.page_content for doc, _ in results)
    sources = [
        {"filename": doc.metadata.get("filename"), "category": doc.metadata.get("category"), "score": round(float(score), 3)}
        for doc, score in results
    ]

    llm = ChatAnthropic(model="claude-sonnet-4-6", api_key=settings.anthropic_api_key, max_tokens=1024)

    prompt = f"""You are a clinical knowledge assistant for hospital staff. Answer the question using ONLY the provided hospital documents.
If the answer is not in the documents, say so clearly. Be concise and clinically precise.

Hospital Documents:
{context}

Question: {question}

Answer:"""

    response = await llm.ainvoke(prompt)
    return {"answer": response.content, "sources": sources}
