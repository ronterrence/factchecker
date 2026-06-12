import React, { useState } from "react";
import { Search, AlertTriangle, CheckCircle, XCircle, Info, Brain, Globe } from "lucide-react";

const ERROR_ANALYSIS = {
  credibilityScore: 0,
  verdict: "Error",
  summary: "Unable to analyze. Please try again.",
  redFlags: ["Analysis failed"],
  positiveSignals: [],
  recommendations: ["Check backend status and API keys"],
};

export default function FakeNewsChecker() {
  const [input, setInput] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkNews = async () => {
    if (!input.trim()) return;

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const parsed = await response.json();
      setAnalysis(parsed);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis(ERROR_ANALYSIS);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict) => {
    const colors = {
      "Likely True": "text-green-600 bg-green-50 border-green-200",
      "Partially True": "text-yellow-600 bg-yellow-50 border-yellow-200",
      Unclear: "text-gray-600 bg-gray-50 border-gray-200",
      "Likely False": "text-orange-600 bg-orange-50 border-orange-200",
      False: "text-red-600 bg-red-50 border-red-200",
      Error: "text-red-600 bg-red-50 border-red-200",
    };

    return colors[verdict] || "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getVerdictIcon = (verdict) => {
    if (verdict?.includes("True") && !verdict.includes("Partially")) {
      return <CheckCircle className="w-6 h-6" />;
    }

    if (verdict?.includes("False") || verdict === "Error") {
      return <XCircle className="w-6 h-6" />;
    }

    return <AlertTriangle className="w-6 h-6" />;
  };

  const scoreColor =
    analysis?.credibilityScore > 70
      ? "#16a34a"
      : analysis?.credibilityScore > 40
        ? "#eab308"
        : "#dc2626";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Search className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Fake News Checker</h1>
          </div>
          <p className="text-gray-600">Analyze news articles and claims for credibility</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Enter a news claim, headline, or paste article URL
          </label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g., 'Scientists discover cure for all cancers' or paste an article URL..."
            className="w-full h-32 p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
          />
          <button
            onClick={checkNews}
            disabled={loading || !input.trim()}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

        {analysis && (
          <div className="space-y-4">
            <div className={`rounded-xl shadow-lg p-6 border-2 ${getVerdictColor(analysis.verdict)}`}>
              <div className="flex items-center gap-3 mb-3">
                {getVerdictIcon(analysis.verdict)}
                <h2 className="text-2xl font-bold">{analysis.verdict}</h2>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold">Credibility Score</span>
                  <span className="text-lg font-bold">{analysis.credibilityScore}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${analysis.credibilityScore}%`,
                      backgroundColor: scoreColor,
                    }}
                  />
                </div>
              </div>

              <p className="text-sm leading-relaxed">{analysis.summary}</p>

              {analysis.provider && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-75">
                  Provider: {analysis.provider}
                </p>
              )}
            </div>

            {analysis.redFlags?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-800">Red Flags</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.redFlags.map((flag, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.positiveSignals?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">Positive Signals</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.positiveSignals.map((signal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.recommendations?.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">How to Verify</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-1">{index + 1}.</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-bold text-gray-800">General Tips for Spotting Fake News</h3>
              </div>
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
          </div>
        )}
      </div>
    </div>
  );
}
