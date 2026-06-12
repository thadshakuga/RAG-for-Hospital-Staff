# ClinicalAssist — RAG for Hospital Staff

Secure internal app for hospital staff: team chat, AI-powered document Q&A, and document management.

## Features
- **Team Chat** — Real-time WebSocket channels by ward/department (doctor, nurse, admin, pharmacist roles)
- **Ask AI** — RAG-powered Q&A over uploaded hospital documents using Claude
- **Document Library** — Upload PDFs, DOCX, TXT (SOPs, protocols, guidelines, HR policies); auto-indexed into ChromaDB

## Stack
- **Backend**: Python + FastAPI, PostgreSQL, ChromaDB, LangChain, Claude (Anthropic)
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4

## Quick Start (local dev)

### 1. Start PostgreSQL
```bash
docker run -d --name pg -e POSTGRES_USER=hospital -e POSTGRES_PASSWORD=hospital -e POSTGRES_DB=hospital_rag -p 5432:5432 postgres:16-alpine
```

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and set SECRET_KEY
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — register an account and start using.

### Docker (all-in-one)
```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
```

## Environment Variables (backend/.env)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret (change in prod) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `CHROMA_PERSIST_DIR` | Where ChromaDB stores vectors |
| `UPLOAD_DIR` | Where uploaded files are stored |

## API Endpoints
- `POST /auth/register` — Create account
- `POST /auth/login` — Get JWT token
- `GET /chat/rooms` — List channels
- `WS /chat/ws/{room_id}?token=...` — WebSocket chat
- `POST /documents/upload` — Upload document (multipart)
- `GET /documents/` — List documents
- `POST /documents/ask` — Ask a question (RAG)
