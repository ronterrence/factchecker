import React, { useState } from "react";
import { Search, AlertTriangle, CheckCircle, XCircle, Info, Brain, Globe } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const API_URL = `${API_BASE_URL}/api/check`;
const DEFAULT_CARD_CLASS = "surface-card-soft p-6";
const VERDICT_COLORS = {
  "Likely True": "text-green-600 bg-green-50 border-green-200",
  "Partially True": "text-yellow-600 bg-yellow-50 border-yellow-200",
  Unclear: "text-gray-600 bg-gray-50 border-gray-200",
  "Likely False": "text-orange-600 bg-orange-50 border-orange-200",
  False: "text-red-600 bg-red-50 border-red-200",
  Error: "text-red-600 bg-red-50 border-red-200",
};

const ERROR_ANALYSIS = {
  credibilityScore: 0,
  verdict: "Error",
  summary: "Unable to analyze. Please try again.",
  redFlags: ["Analysis failed"],
  positiveSignals: [],
  recommendations: ["Check backend status and API keys"],
};

function getVerdictColor(verdict) {
  return VERDICT_COLORS[verdict] || "text-gray-600 bg-gray-50 border-gray-200";
}

function getVerdictIcon(verdict) {
  if (verdict?.includes("True") && !verdict.includes("Partially")) {
    return <CheckCircle className="w-6 h-6" />;
  }

  if (verdict?.includes("False") || verdict === "Error") {
    return <XCircle className="w-6 h-6" />;
  }

  return <AlertTriangle className="w-6 h-6" />;
}

function getScoreColor(score) {
  if (score > 70) {
    return "#16a34a";
  }

  if (score > 40) {
    return "#eab308";
  }

  return "#dc2626";
}

function normalizeAnalysisResponse(data) {
  const score = Number(data?.credibilityScore);

  return {
    credibilityScore: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    verdict: data?.verdict || "Unclear",
    summary: data?.summary || "No summary available.",
    redFlags: Array.isArray(data?.redFlags) ? data.redFlags : [],
    positiveSignals: Array.isArray(data?.positiveSignals) ? data.positiveSignals : [],
    recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
    provider: data?.provider || null,
  };
}

function SectionHeader({ icon, iconColorClassName, title }) {
  return (
    <div className="section-header">
      <span className="section-header__icon">
        {React.cloneElement(icon, { className: `w-5 h-5 ${iconColorClassName}` })}
      </span>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
  );
}

function AnalysisListSection({ title, icon, iconColorClassName, markerClassName, items, ordered = false }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className={DEFAULT_CARD_CLASS}>
      <SectionHeader
        icon={icon}
        iconColorClassName={iconColorClassName}
        title={title}
      />
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`${markerClassName} mt-1`}>{ordered ? `${index + 1}.` : "•"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TipsCard() {
  return (
    <div className="tips-card bg-gradient-to-r from-purple-50/95 to-blue-50/95 rounded-[1.25rem] p-6">
      <SectionHeader
        icon={<Globe />}
        iconColorClassName="text-purple-600"
        title="General Tips for Spotting Fake News"
      />
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex items-start gap-2">
          <span className="text-purple-500 mt-1">→</span>
          <span>Check the source: Is it from a reputable, established news organization?</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-purple-500 mt-1">→</span>
          <span>Look for author credentials and publication date</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-purple-500 mt-1">→</span>
          <span>Cross-reference with multiple reliable sources</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-purple-500 mt-1">→</span>
          <span>Be skeptical of sensational headlines and emotional language</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-purple-500 mt-1">→</span>
          <span>Check if images are authentic using reverse image search</span>
        </li>
      </ul>
    </div>
  );
}

export default function FakeNewsChecker() {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkNews = async () => {
    if (!input.trim() || !apiKey.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input, provider, api_key: apiKey }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const parsed = await response.json();
      setAnalysis(normalizeAnalysisResponse(parsed));
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis(ERROR_ANALYSIS);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = getScoreColor(analysis?.credibilityScore ?? 0);

  return (
    <div className="app-shell min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="content-shell mx-auto max-w-4xl">
        <header className="hero-block mb-10 md:mb-12">
          <div className="hero-badge">
            <Search className="h-4 w-4" />
            <span className="text-sm font-semibold">AI-assisted credibility analysis</span>
          </div>
          <div className="hero-heading-row">
            <span className="hero-icon-wrap">
              <Search className="h-7 w-7 md:h-8 md:w-8 text-blue-600" />
            </span>
            <h1 className="hero-title text-4xl md:text-5xl font-bold text-slate-900">Fake News Checker</h1>
          </div>
          <p className="hero-subtitle">Analyze claims, headlines, and links with structured signals, red flags, and verification guidance.</p>
        </header>
        
        {/* Input Section */}
        <section className="surface-card input-panel mb-8 p-6 md:p-7">
          <div className="panel-content">
            <div className="provider-grid">
              <div>
                <label className="input-label" htmlFor="provider">
                  AI provider
                </label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className="textarea-polished provider-select"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="mistral">Mistral</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label className="input-label" htmlFor="api-key">
                  Your API key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Used for this request only"
                  autoComplete="off"
                  className="textarea-polished api-key-input"
                />
              </div>
            </div>
            <p className="input-help">
              Your key is sent over HTTPS for the selected analysis and is not stored by this app.
            </p>
            <label className="input-label">
              Enter a news claim, headline, or paste article URL
            </label>
            <p className="input-help">Try a headline, social post, or article link. Short and specific usually works best.</p>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g., 'Scientists discover cure for all cancers' or paste an article URL..."
              className="textarea-polished"
            />
            <div className="cta-row">
              <button
                onClick={checkNews}
                disabled={loading || !input.trim() || !apiKey.trim()}
                className="primary-button"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Check Credibility
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
       
        {/* Analysis Results */}
        {analysis && (
          <div className="results-stack space-y-5">
            <div className={`surface-card verdict-card p-6 md:p-7 border-2 ${getVerdictColor(analysis.verdict)}`}>
              <div className="verdict-header mb-4">
                <span className="verdict-header__icon">{getVerdictIcon(analysis.verdict)}</span>
                <h2 className="text-2xl font-bold">{analysis.verdict}</h2>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Credibility Score</span>
                  <span className="text-lg font-bold">{analysis.credibilityScore}/100</span>
                </div>
                <div className="score-track w-full h-3">
                  <div
                    className="score-fill h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${analysis.credibilityScore}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
              </div>

              <p className="text-sm leading-relaxed">{analysis.summary}</p>

              {analysis.provider && (
                <p className="provider-chip text-xs font-semibold uppercase tracking-[0.18em]">
                  Provider: {analysis.provider}
                </p>
              )}
            </div>

            {/* Red Flags */}
            <AnalysisListSection
              title="Red Flags"
              icon={<AlertTriangle />}
              iconColorClassName="text-red-600"
              markerClassName="text-red-500"
              items={analysis.redFlags}
            />

            <AnalysisListSection
              title="Positive Signals"
              icon={<CheckCircle />}
              iconColorClassName="text-green-600"
              markerClassName="text-green-500"
              items={analysis.positiveSignals}
            />

            <AnalysisListSection
              title="How to Verify"
              icon={<Info />}
              iconColorClassName="text-blue-600"
              markerClassName="text-blue-500"
              items={analysis.recommendations}
              ordered
            />

            <TipsCard />
          </div>
        )}
      </div>
    </div>
  );
}
