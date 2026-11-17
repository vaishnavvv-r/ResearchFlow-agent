from .provider import LLMProvider, LLMResponse


class MockProvider(LLMProvider):
    name = "mock"

    async def generate(self, prompt: str) -> LLMResponse:
        return LLMResponse(
            text=("Mock mode is active. This response is a deterministic placeholder "
                   "for local development and is not a verified research finding."),
            provider=self.name,
            mock=True,
        )
