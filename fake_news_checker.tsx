import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Info, ExternalLink, Brain, Globe } from 'lucide-react';

export default function FakeNewsChecker() {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkNews = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { 
              role: "user", 
              content: `Analyze this news claim or article for credibility. Provide a structured analysis in JSON format with these fields:
              - credibilityScore (0-100)
              - verdict ("Likely True", "Partially True", "Unclear", "Likely False", "False")
              - redFlags (array of concerning elements)
              - positiveSignals (array of credible elements)
              - recommendations (array of verification steps)
              - summary (brief explanation)
              
              News to analyze: ${input}
              
              Respond ONLY with valid JSON, no preamble or markdown.`
            }
          ],
          tools: [
            {
              "type": "web_search_20250305",
              "name": "web_search"
            }
          ]
        })
      });

      const data = await response.json();
      const textContent = data.content
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n");
      
      const cleanText = textContent.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      setAnalysis(parsed);
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis({
        credibilityScore: 0,
        verdict: "Error",
        summary: "Unable to analyze. Please try again.",
        redFlags: ["Analysis failed"],
        positiveSignals: [],
        recommendations: ["Try rephrasing your input"]
      });
    }
    
    setLoading(false);
  };

  const getVerdictColor = (verdict) => {
    const colors = {
      "Likely True": "text-green-600 bg-green-50 border-green-200",
      "Partially True": "text-yellow-600 bg-yellow-50 border-yellow-200",
      "Unclear": "text-gray-600 bg-gray-50 border-gray-200",
      "Likely False": "text-orange-600 bg-orange-50 border-orange-200",
      "False": "text-red-600 bg-red-50 border-red-200"
    };
    return colors[verdict] || "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getVerdictIcon = (verdict) => {
    if (verdict?.includes("True") && !verdict.includes("Partially")) return <CheckCircle className="w-6 h-6" />;
    if (verdict?.includes("False")) return <XCircle className="w-6 h-6" />;
    return <AlertTriangle className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Search className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">Fake News Checker</h1>
          </div>
          <p className="text-gray-600">Analyze news articles and claims for credibility</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Enter a news claim, headline, or paste article URL
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
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

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            {/* Verdict Card */}
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
                      backgroundColor: analysis.credibilityScore > 70 ? '#16a34a' : 
                                      analysis.credibilityScore > 40 ? '#eab308' : '#dc2626'
                    }}
                  />
                </div>
              </div>
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </div>

            {/* Red Flags */}
            {analysis.redFlags && analysis.redFlags.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold text-gray-800">Red Flags</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.redFlags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Positive Signals */}
            {analysis.positiveSignals && analysis.positiveSignals.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">Positive Signals</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.positiveSignals.map((signal, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">How to Verify</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-1">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
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