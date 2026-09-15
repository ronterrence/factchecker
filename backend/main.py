import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx

PROVIDERS = [
    {
        "name": "deepseek",
        "kind": "openai",
        "url": "https://api.deepseek.com/chat/completions",
        "model": "deepseek-chat",
    },
    {
        "name": "mistral",
        "kind": "openai",
        "url": "https://api.mistral.ai/v1/chat/completions",
        "model": "mistral-small-latest",
    },
    {
        "name": "anthropic",
        "kind": "anthropic",
        "url": "https://api.anthropic.com/v1/messages",
        "model": "claude-sonnet-4-5",
    },
]

app = FastAPI()

DEV_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
configured_origins = os.getenv("FRONTEND_ORIGINS")
if configured_origins:
    DEV_FRONTEND_ORIGINS.extend(
        origin.strip() for origin in configured_origins.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    input: str = Field(min_length=1, max_length=20_000)
    provider: str = Field(min_length=1, max_length=32)
    api_key: str = Field(min_length=1, max_length=512)

DEFAULT_ANALYSIS_PROMPT = """Analyze this news claim or article for credibility. Provide a structured analysis in JSON format with these fields:
- credibilityScore (0-100)
- verdict (\"Likely True\", \"Partially True\", \"Unclear\", \"Likely False\", \"False\")
- redFlags (array of concerning elements)
- positiveSignals (array of credible elements)
- recommendations (array of verification steps)
- summary (brief explanation)

News to analyze: {text}

Respond ONLY with valid JSON, no preamble or markdown.
"""


def extract_json_from_raw(raw: str):
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "Model did not return valid JSON", "raw": raw},
        ) from exc


async def call_openai_compatible(
    client: httpx.AsyncClient,
    provider: dict,
    prompt: str,
    api_key: str,
    *,
    model: str | None = None,
):
    payload = {
        "model": model or provider["model"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    response = await client.post(provider["url"], headers=headers, json=payload)
    if response.status_code >= 400:
        raise RuntimeError(f"{provider['name']} error {response.status_code}: {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"].strip()
    return extract_json_from_raw(raw)


async def call_anthropic(
    client: httpx.AsyncClient,
    provider: dict,
    prompt: str,
    api_key: str,
    *,
    model: str | None = None,
    tools: list[dict] | None = None,
):
    payload = {
        "model": model or provider["model"],
        "max_tokens": 800,
        "messages": [{"role": "user", "content": prompt}],
    }
    if tools:
        payload["tools"] = tools
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    response = await client.post(provider["url"], headers=headers, json=payload)
    if response.status_code >= 400:
        raise RuntimeError(f"{provider['name']} error {response.status_code}: {response.text}")

    data = response.json()
    text_blocks = [b.get("text", "") for b in data.get("content", []) if b.get("type") == "text"]
    raw = "\n".join(text_blocks).strip()
    return extract_json_from_raw(raw)


async def call_provider(
    client: httpx.AsyncClient,
    provider: dict,
    prompt: str,
    api_key: str,
    *,
    model: str | None = None,
    tools: list[dict] | None = None,
):
    if provider["kind"] == "openai":
        return await call_openai_compatible(client, provider, prompt, api_key, model=model)
    if provider["kind"] == "anthropic":
        return await call_anthropic(client, provider, prompt, api_key, model=model, tools=tools)
    raise RuntimeError(f"Unsupported provider kind: {provider['kind']}")


def validate_input(text: str) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Empty input")
    return cleaned


def get_provider(name: str) -> dict:
    for provider in PROVIDERS:
        if provider["name"] == name:
            return provider
    raise HTTPException(status_code=400, detail="Unsupported provider")


async def analyze_with_providers(
    *,
    prompt: str,
    providers: list[dict],
    api_key: str,
    model_overrides: dict[str, str] | None = None,
    tool_overrides: dict[str, list[dict]] | None = None,
):
    errors = []

    async with httpx.AsyncClient(timeout=60) as client:
        for provider in providers:
            try:
                parsed = await call_provider(
                    client,
                    provider,
                    prompt,
                    api_key,
                    model=(model_overrides or {}).get(provider["name"]),
                    tools=(tool_overrides or {}).get(provider["name"]),
                )
                parsed["provider"] = provider["name"]
                return parsed
            except Exception as exc:
                errors.append({"provider": provider["name"], "error": str(exc)})

    raise HTTPException(status_code=502, detail={"error": "All providers failed", "providers": errors})


@app.get("/health")
def health():
    return {"ok": True, "providers": [provider["name"] for provider in PROVIDERS]}


@app.post("/api/check")
async def check(req: CheckRequest):
    text = validate_input(req.input)
    prompt = DEFAULT_ANALYSIS_PROMPT.format(text=text)
    provider = get_provider(req.provider)
    return await analyze_with_providers(
        prompt=prompt,
        providers=[provider],
        api_key=req.api_key,
    )
