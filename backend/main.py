import os
import json
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# charge le .env situé EXACTEMENT dans le même dossier que ce fichier
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))


def get_env_var(name: str, *, required: bool = False) -> str | None:
    value = os.getenv(name)
    if required and not value:
        raise RuntimeError(f"Missing {name} in backend/.env")
    return value


ANTHROPIC_API_KEY = get_env_var("ANTHROPIC_API_KEY")
MISTRAL_API_KEY = get_env_var("MISTRAL_API_KEY")
DEEPSEEK_API_KEY = get_env_var("DEEPSEEK_API_KEY")

PROVIDERS = [
    {
        "name": "deepseek",
        "api_key": DEEPSEEK_API_KEY,
        "kind": "openai",
        "url": "https://api.deepseek.com/chat/completions",
        "model": "deepseek-chat",
    },
    {
        "name": "mistral",
        "api_key": MISTRAL_API_KEY,
        "kind": "openai",
        "url": "https://api.mistral.ai/v1/chat/completions",
        "model": "mistral-small-latest",
    },
    {
        "name": "anthropic",
        "api_key": ANTHROPIC_API_KEY,
        "kind": "anthropic",
        "url": "https://api.anthropic.com/v1/messages",
        "model": "claude-sonnet-4-5",
    },
]

app = FastAPI()

# (simple) autorise le front en dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckRequest(BaseModel):
    input: str

def extract_json_from_raw(raw: str):
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "Model did not return valid JSON", "raw": raw},
        ) from exc


async def call_openai_compatible(client: httpx.AsyncClient, provider: dict, prompt: str):
    payload = {
        "model": provider["model"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 800,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {provider['api_key']}",
        "Content-Type": "application/json",
    }
    response = await client.post(provider["url"], headers=headers, json=payload)
    if response.status_code >= 400:
        raise RuntimeError(f"{provider['name']} error {response.status_code}: {response.text}")

    data = response.json()
    raw = data["choices"][0]["message"]["content"].strip()
    return extract_json_from_raw(raw)


async def call_anthropic(client: httpx.AsyncClient, provider: dict, prompt: str):
    payload = {
        "model": provider["model"],
        "max_tokens": 800,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {
        "x-api-key": provider["api_key"],
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


async def call_provider(client: httpx.AsyncClient, provider: dict, prompt: str):
    if provider["kind"] == "openai":
        return await call_openai_compatible(client, provider, prompt)
    if provider["kind"] == "anthropic":
        return await call_anthropic(client, provider, prompt)
    raise RuntimeError(f"Unsupported provider kind: {provider['kind']}")


@app.get("/health")
def health():
    available = [provider["name"] for provider in PROVIDERS if provider["api_key"]]
    return {"ok": True, "providers": available, "default": "deepseek"}

@app.post("/api/check")
async def check(req: CheckRequest):
    text = (req.input or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty input")

    prompt = f"""Analyze this news claim or article for credibility. Provide a structured analysis in JSON format with these fields:
- credibilityScore (0-100)
- verdict ("Likely True", "Partially True", "Unclear", "Likely False", "False")
- redFlags (array of concerning elements)
- positiveSignals (array of credible elements)
- recommendations (array of verification steps)
- summary (brief explanation)

News to analyze: {text}

Respond ONLY with valid JSON, no preamble or markdown.
"""

    enabled_providers = [provider for provider in PROVIDERS if provider["api_key"]]
    if not enabled_providers:
        raise RuntimeError("Missing provider API key in backend/.env")

    errors = []

    async with httpx.AsyncClient(timeout=60) as client:
        for provider in enabled_providers:
            try:
                parsed = await call_provider(client, provider, prompt)
                parsed["provider"] = provider["name"]
                return parsed
            except Exception as exc:
                errors.append({"provider": provider["name"], "error": str(exc)})

    raise HTTPException(status_code=502, detail={"error": "All providers failed", "providers": errors})
