import pytest
from app.core.config import Settings
from app.llm.provider import build_provider
from app.search.search_cache import SearchCache


def test_mock_provider_selection():
    provider = build_provider(Settings(llm_provider="mock", mock_llm=True))
    assert provider.name == "mock"


def test_unknown_provider_rejected():
    with pytest.raises(ValueError):
        build_provider(Settings(llm_provider="paid-provider", mock_llm=False))


def test_search_cache_round_trip():
    cache = SearchCache(ttl_seconds=60)
    cache.set("query", [{"url": "https://example.com"}])
    assert cache.get("query")[0]["url"] == "https://example.com"
