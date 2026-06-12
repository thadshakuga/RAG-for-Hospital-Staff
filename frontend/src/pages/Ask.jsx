import { useState } from "react";
import api from "../services/api";
import { Send, BookOpen, FileText } from "lucide-react";

const CATEGORIES = ["", "protocol", "sop", "guidelines", "hr", "pharmacy", "forms", "general"];

export default function Ask() {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    const q = question.trim();
    setQuestion("");
    try {
      const { data } = await api.post("/documents/ask", { question: q, category: category || null });
      const entry = { question: q, ...data };
      setResult(entry);
      setHistory((prev) => [entry, ...prev]);
    } catch {
      setResult({ question: q, answer: "Error contacting server. Please try again.", sources: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Ask Hospital Documents</h1>
      </div>
      <p className="text-gray-500 text-sm">Ask any question about hospital protocols, SOPs, guidelines, or policies.</p>

      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <div className="flex gap-3">
          <textarea
            rows={3}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder='e.g. "What is the sepsis management protocol?" or "What are the hand hygiene guidelines?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
          />
        </div>
        <div className="flex items-center justify-between">
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={ask} disabled={!question.trim() || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-5 py-2 text-sm font-medium transition"
          >
            <Send size={14} />{loading ? "Asking…" : "Ask"}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Question</p>
          <p className="text-gray-800 font-medium">{result.question}</p>
          <hr />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Answer</p>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{result.answer}</p>
          {result.sources?.length > 0 && (
            <>
              <hr />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sources</p>
              <div className="space-y-2">
                {result.sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText size={14} className="text-blue-400 shrink-0" />
                    <span className="font-medium">{s.filename}</span>
                    <span className="text-gray-400 text-xs">[{s.category}]</span>
                    <span className="ml-auto text-xs text-gray-400">score: {s.score}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Previous Questions</p>
          {history.slice(1).map((h, i) => (
            <button key={i} onClick={() => setResult(h)}
              className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-700 transition">
              {h.question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
