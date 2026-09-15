# Fake News Checker

AI-assisted credibility analysis for news claims, headlines, and article URLs.

The public app uses a bring-your-own-key (BYOK) model. Each visitor selects a provider and enters their own API key. The key is kept in browser memory, sent over HTTPS for the analysis request, and is not stored by this application.

## Supported providers

- DeepSeek
- Mistral
- Anthropic

## Requirements

- Node.js 18+
- Python 3.10+
- An API key for one of the supported providers

## Local development

Install frontend dependencies:

```bash
npm install
```

Create the backend virtual environment and install Python dependencies:

```bash
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Start the frontend and backend together:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:8000`.

The frontend defaults to `http://localhost:8000` for the API. To use another API URL, set `VITE_API_BASE_URL` before building or running the frontend.

## Production deployment

Deploy the frontend and FastAPI backend as public HTTPS services. The frontend must point to the backend using:

```text
VITE_API_BASE_URL=https://your-api.example.com
```

Configure the backend with the deployed frontend origin:

```text
FRONTEND_ORIGINS=https://your-app.example.com
```

Multiple origins may be separated by commas. The backend does not require provider API keys for the BYOK flow.

Run the API in production with:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Build the frontend with:

```bash
npm run build
```

Serve the generated `dist` directory with a static hosting provider.

### Render

This repository includes `render.yaml` for a Render Blueprint with two services:

1. `factchecker-api`: FastAPI web service
2. `factchecker`: Vite static site

To deploy:

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint** and select this repository.
3. Set `FRONTEND_ORIGINS` on `factchecker-api` to the exact URL Render gives the `factchecker` static site, for example `https://factchecker.onrender.com`.
4. Deploy both services.

The API service does not need a provider API key because visitors supply their own key in the app. Render's free web service may sleep when idle, so the first request after inactivity can take longer.

## Security notes

- Never commit `.env` files or API keys.
- API keys are accepted only per request and are not written to a database or local storage.
- Use HTTPS in production.
- Set `FRONTEND_ORIGINS` to the exact frontend origin instead of allowing arbitrary origins.
- Add provider-side spending limits and rotate a key immediately if it is exposed.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite frontend and FastAPI backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build the production frontend |
| `npm run lint` | Run ESLint |
