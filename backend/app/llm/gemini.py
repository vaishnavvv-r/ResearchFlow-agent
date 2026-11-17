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
        content = result.content
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict):
                    value = block.get("text")
                    if value:
                        parts.append(str(value))
                else:
                    value = getattr(block, "text", None)
                    if value:
                        parts.append(str(value))
            text = "\n".join(parts) or str(content)
        else:
            text = str(content)
        return LLMResponse(text=text, provider=self.name)
