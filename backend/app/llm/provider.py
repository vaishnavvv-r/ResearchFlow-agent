from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResponse:
    text: str
    provider: str
    mock: bool = False


class LLMProvider(ABC):
    name = "unknown"

    @abstractmethod
    async def generate(self, prompt: str) -> LLMResponse:
        raise NotImplementedError


def build_provider(settings) -> LLMProvider:
    provider = settings.llm_provider.lower().strip()
    if settings.mock_llm or provider == "mock":
        from .mock import MockProvider
        return MockProvider()
    if provider == "gemini":
        from .gemini import GeminiProvider
        return GeminiProvider(settings)
    if provider == "ollama":
        from .ollama import OllamaProvider
        return OllamaProvider(settings)
    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")
