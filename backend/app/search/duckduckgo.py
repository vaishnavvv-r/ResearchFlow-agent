import asyncio
from ddgs import DDGS
from .search_cache import SearchCache


class DuckDuckGoSearch:
    def __init__(self, cache=None):
        self.cache = cache or SearchCache()

    async def search(self, query: str, max_results: int = 5):
        key = f"{query.strip().lower()}:{max_results}"
        cached = self.cache.get(key)
        if cached is not None:
            return cached

        def run():
            return [{"title": x.get("title", ""), "url": x.get("href", ""), "content": x.get("body", "")} for x in DDGS().text(query, max_results=max_results)]

        try:
            results = await asyncio.wait_for(asyncio.to_thread(run), timeout=20)
        except Exception:
            results = []
        unique, seen = [], set()
        for result in results:
            if result["url"] and result["url"] not in seen:
                unique.append(result)
                seen.add(result["url"])
        self.cache.set(key, unique)
        return unique
