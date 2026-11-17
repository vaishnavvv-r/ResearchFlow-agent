import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ...core.config import get_settings
from ...llm.provider import build_provider
from ...schemas.research import ResearchCreate, ResearchProject
from ...search.duckduckgo import DuckDuckGoSearch

router = APIRouter(prefix="/api/research", tags=["research"])
projects = {}
events = {}
searcher = DuckDuckGoSearch()


@router.post("", response_model=ResearchProject, status_code=201)
async def create_research(payload: ResearchCreate):
    settings = get_settings()
    provider = build_provider(settings)
    project_id = str(uuid4())
    project = ResearchProject(id=project_id, title=payload.topic, topic=payload.topic, objective=payload.objective,
                              research_depth=payload.research_depth, status="queued", provider=provider.name,
                              created_at=datetime.now(timezone.utc))
    projects[project_id] = project
    events[project_id] = []
    asyncio.create_task(_run_research(project_id, payload))
    return project


async def _run_research(project_id, payload):
    events[project_id].append({"type": "agent", "agent": "Planner Agent", "status": "completed", "message": "Research plan created."})
    results = await searcher.search(payload.topic, payload.max_sources)
    events[project_id].append({"type": "agent", "agent": "Research Agent", "status": "completed", "message": f"Collected {len(results)} public sources."})
    project = projects[project_id]
    projects[project_id] = project.model_copy(update={"status": "completed", "sources_count": len(results)})
    events[project_id].append({"type": "complete", "message": "Research foundation complete.", "sources": results})


@router.get("", response_model=list[ResearchProject])
async def list_research():
    return list(projects.values())


@router.get("/{research_id}", response_model=ResearchProject)
async def get_research(research_id: str):
    if research_id not in projects:
        raise HTTPException(404, "Research project not found")
    return projects[research_id]


@router.get("/{research_id}/stream")
async def stream_research(research_id: str):
    if research_id not in projects:
        raise HTTPException(404, "Research project not found")

    async def generator():
        sent = 0
        while sent < len(events[research_id]) or projects[research_id].status == "queued":
            while sent < len(events[research_id]):
                yield f"data: {json.dumps(events[research_id][sent])}\n\n"
                sent += 1
            await asyncio.sleep(0.25)
        yield "data: [DONE]\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")
