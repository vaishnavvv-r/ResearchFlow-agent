# ResearchFlow Agent

ResearchFlow Agent is a modular, multi-agent research assistant foundation. Phase 1 provides a FastAPI backend with a provider abstraction (Gemini, Ollama, or Mock), free DuckDuckGo search integration, in-memory research projects, and a polished React/Vite dashboard.

## Quick start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000` and Swagger at `/docs`. Mock mode works without credentials.

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

## Architecture

- `backend/app/llm`: provider abstraction and safe fallback-free provider selection.
- `backend/app/search`: DuckDuckGo search with timeout, retry, deduplication, and caching.
- `backend/app/api`: validated research endpoints and a first SSE-compatible event stream.
- `frontend/src`: TypeScript dashboard shell ready for the research workspace and report views.

Phase 2 will add persistent PostgreSQL models, the LangGraph workflow, web extraction, and RAG ingestion. No paid search provider is used.

## Configuration

Copy `backend/.env.example` to `backend/.env`. Set `LLM_PROVIDER=mock` for local development, or configure Gemini/Ollama explicitly.
