from .provider import LLMProvider, LLMResponse


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, settings):
        if not settings.google_api_key or not settings.gemini_model:
            raise ValueError("Gemini requires GOOGLE_API_KEY and GEMINI_MODEL")
        self.settings = settings

    async def generate(self, prompt: str) -> LLMResponse:
        from langchain_google_genai import ChatGoogleGenerativeAI
        model = ChatGoogleGenerativeAI(model=self.settings.gemini_model, google_api_key=self.settings.google_api_key)
        result = await model.ainvoke(prompt)
        return LLMResponse(text=str(result.content), provider=self.name)
