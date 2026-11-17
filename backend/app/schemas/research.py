from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class ResearchCreate(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    objective: str = Field(default="Understand the topic and summarize reliable evidence.", max_length=1000)
    research_depth: Literal["quick", "standard", "deep"] = "standard"
    max_sources: int = Field(default=8, ge=1, le=50)


class ResearchProject(BaseModel):
    id: str
    title: str
    topic: str
    objective: str
    research_depth: str
    status: str
    provider: str
    created_at: datetime
    sources_count: int = 0


class ResearchReport(BaseModel):
    research_id: str
    title: str
    content: str
    provider: str
    mock: bool = False
    sources: list[dict] = []
