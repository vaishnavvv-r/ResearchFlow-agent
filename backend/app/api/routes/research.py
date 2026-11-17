import asyncio
import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ...core.config import get_settings
from ...llm.provider import build_provider
from ...schemas.research import ResearchCreate, ResearchProject, ResearchReport
from ...search.duckduckgo import DuckDuckGoSearch

router = APIRouter(prefix="/api/research", tags=["research"])
projects = {}
events = {}
reports = {}
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
    asyncio.create_task(_run_research(project_id, payload, provider))
    return project


async def _run_research(project_id, payload, provider):
    try:
        events[project_id].append({"type": "agent", "agent": "Planner Agent", "status": "completed", "message": "Research plan created."})
        queries = [
            payload.topic,
            f"{payload.topic} latest research",
            f"{payload.topic} evidence sources",
        ]
        results, seen_urls = [], set()
        per_query = max(1, payload.max_sources // len(queries))
        for query in queries:
            for item in await searcher.search(query, per_query):
                if item.get("url") and item["url"] not in seen_urls:
                    results.append(item)
                    seen_urls.add(item["url"])
        results = results[:payload.max_sources]
        events[project_id].append({"type": "agent", "agent": "Research Agent", "status": "completed", "message": f"Collected {len(results)} public sources."})
        evidence = "\n\n".join(f"SOURCE {i}: {item.get('title', '')}\nURL: {item.get('url', '')}\nSNIPPET: {item.get('content', '')}" for i, item in enumerate(results, 1))
        prompt = f"""You are the report writer for a research assistant.\nResearch question: {payload.topic}\nObjective: {payload.objective}\n\nUse only the source snippets below. Do not invent facts or citations. If evidence is insufficient, say so clearly. Return Markdown with Executive summary, Key findings, Limitations, and References. Cite claims inline as [1], [2], etc. In References, make every source clickable using exactly this format: [1] [Source title](https://source-url).\n\n{evidence or 'No search results were available. Explain that the question could not be verified.'}"""
        events[project_id].append({"type": "agent", "agent": "Report Writer Agent", "status": "running", "message": "Generating an evidence-aware report."})
        response = await provider.generate(prompt)
        report = ResearchReport(research_id=project_id, title=payload.topic, content=response.text, provider=response.provider, mock=response.mock, sources=results)
        reports[project_id] = report
        projects[project_id] = projects[project_id].model_copy(update={"status": "completed", "sources_count": len(results)})
        events[project_id].append({"type": "complete", "message": "Report generated.", "sources": results, "report": report.model_dump()})
    except Exception as exc:
        projects[project_id] = projects[project_id].model_copy(update={"status": "failed"})
        events[project_id].append({"type": "error", "message": str(exc)})


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
        while sent < len(events[research_id]) or projects[research_id].status in {"queued", "running"}:
            while sent < len(events[research_id]):
                yield f"data: {json.dumps(events[research_id][sent])}\n\n"
                sent += 1
            await asyncio.sleep(0.25)
        yield "data: [DONE]\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@router.get("/{research_id}/report", response_model=ResearchReport)
async def get_report(research_id: str):
    if research_id not in reports:
        raise HTTPException(404, "Report is not ready")
    return reports[research_id]
