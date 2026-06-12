import { useState, useEffect } from "react";
import api from "../services/api";
import { Upload, Trash2, FileText, File } from "lucide-react";

const CATEGORIES = ["general", "protocol", "sop", "guidelines", "hr", "pharmacy", "forms"];

function FileIcon({ type }) {
  if (type?.includes("pdf")) return <FileText size={18} className="text-red-500" />;
  if (type?.includes("word")) return <FileText size={18} className="text-blue-500" />;
  return <File size={18} className="text-gray-400" />;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ category: "general", description: "" });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { loadDocs(); }, [filter]);

  async function loadDocs() {
    const params = filter ? { category: filter } : {};
    const { data } = await api.get("/documents/", { params });
    setDocs(data);
  }

  async function uploadFile(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", form.category);
    if (form.description) fd.append("description", form.description);
    try {
      await api.post("/documents/upload", fd);
      await loadDocs();
    } catch (err) {
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(id) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await api.delete(`/documents/${id}`);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}`}
      >
        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">Drop a file here, or</p>
        <label className="mt-2 inline-block cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {uploading ? "Uploading…" : "Browse File"}
          <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => uploadFile(e.target.files[0])} disabled={uploading} />
        </label>
        <p className="text-xs text-gray-400 mt-2">PDF, DOCX, TXT — max 50 MB</p>

        <div className="mt-4 flex gap-3 justify-center flex-wrap">
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input
            type="text" placeholder="Description (optional)"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === c ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {c || "All"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {docs.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No documents yet. Upload your first hospital document.</p>}
        {docs.map((d) => (
          <div key={d.id} className="bg-white border rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-sm transition">
            <FileIcon type={d.file_type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{d.original_name}</p>
              <p className="text-xs text-gray-400">{d.category} · {fmtSize(d.file_size)} · {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}</p>
              {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
            </div>
            <button onClick={() => deleteDoc(d.id)} className="text-gray-300 hover:text-red-500 transition shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
