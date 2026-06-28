import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import "./RaiseIssue.css";

const UPLOADS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function RaiseIssue() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electricity");
  const [hostel, setHostel] = useState("Hostel A");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/");
  }, [navigate]);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get("/requests/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIssues(res.data || []);
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get("/requests/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) setIssues(res.data || []);
      } catch (err) {
        console.log("Fetch error:", err);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleFileChange = (e) => {
    const chosen = e.target.files[0];
    if (chosen) { setFile(chosen); setFileName(chosen.name); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this issue?")) return;
    try {
      const token = localStorage.getItem("token");
      await API.delete(`/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIssues(issues.filter((i) => i._id !== id));
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setDuplicateNotice(null);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("hostel", hostel);
      if (file) formData.append("file", file);

      const res = await API.post("/requests", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      if (res.data.merged) {
        setDuplicateNotice(
          `Same issue already reported — now reported by ${res.data.data.reportCount} people.`
        );
      }
      // Re-fetch so the (possibly merged) card and its updated count show up.
      await fetchIssues();
      setTitle(""); setDescription(""); setCategory("Electricity"); setHostel("Hostel A");
      setFile(null); setFileName("");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to submit issue");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) =>
    s === "Completed" ? "#22c55e" : s === "In Progress" ? "#f59e0b" : "#3b82f6";

  const priorityColor = (p) =>
    p === "High" ? "#ef4444" : p === "Low" ? "#22c55e" : "#f59e0b";

  const categoryIcon = (c) =>
    ({ Electricity:"⚡", Water:"💧", "Mess Food":"🍽️", Cleanliness:"🧹", Internet:"📶", Other:"📌" }[c] || "📌");

  return (
    <div className="raise-page">
      <nav className="navbar">
        <div className="navbar-brand"><span>🦸</span><span>Community Hero</span></div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </nav>

      <div className="raise-content">
        <div className="form-card">
          <div className="form-card-header">
            <h2>Report an Issue</h2>
            <p>Help improve your community by reporting problems</p>
          </div>

          <form onSubmit={handleSubmit} className="issue-form">
            <div className="field">
              <label>Issue Title</label>
              <input type="text" placeholder="e.g. Broken street light on Block B"
                value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Electricity</option>
                <option>Water</option>
                <option>Mess Food</option>
                <option>Cleanliness</option>
                <option>Internet</option>
                <option>Other</option>
              </select>
            </div>

            <div className="field">
              <label>Hostel</label>
              <select value={hostel} onChange={(e) => setHostel(e.target.value)}>
                <option>Hostel A</option>
                <option>Hostel B</option>
                <option>Hostel C</option>
                <option>Hostel D</option>
                <option>Common</option>
              </select>
            </div>

            <div className="field">
              <label>Description</label>
              <textarea placeholder="Describe the issue in detail..."
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows="4" required />
            </div>

            <div className="field">
              <label>Attach a File <span className="optional">(optional)</span></label>
              <label className="file-upload-box">
                <input type="file" accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange} style={{ display: "none" }} />
                <span className="file-upload-icon">📎</span>
                <span className="file-upload-text">
                  {fileName ? fileName : "Click to choose a file"}
                </span>
                <span className="file-upload-hint">
                  {fileName ? "✓ File selected" : "Images, PDF, DOC up to 5MB"}
                </span>
              </label>
            </div>

            {duplicateNotice && (
              <p className="duplicate-notice">🔗 {duplicateNotice}</p>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Submitting..." : "Submit Issue"}
            </button>
          </form>
        </div>

        <div className="issues-section">
          <h2 className="issues-heading">
            My Issues <span className="issue-count">{issues.length}</span>
          </h2>

          {issues.length === 0 ? (
            <div className="empty-state">
              <span>📭</span>
              <p>No issues submitted yet</p>
            </div>
          ) : (
            <div className="issues-grid">
              {issues.map((issue) => (
                <div className="issue-card" key={issue._id}>
                  <div className="issue-card-top">
                    <span className="issue-category-badge">
                      {categoryIcon(issue.category)} {issue.category}
                    </span>
                    <span className="issue-status" style={{ color: statusColor(issue.status) }}>
                      ● {issue.status || "Open"}
                    </span>
                  </div>
                  {issue.hostel && (
                    <span className="hostel-badge">📍 {issue.hostel}</span>
                  )}

                  <h3 className="issue-title">{issue.title}</h3>
                  <p className="issue-description">{issue.description}</p>

                  {issue.reportCount > 1 && (
                    <button
                      type="button"
                      className="report-count-badge"
                      onClick={() => setExpandedId(expandedId === issue._id ? null : issue._id)}
                    >
                      🔥 Reported by {issue.reportCount} people — {expandedId === issue._id ? "hide" : "view all"}
                    </button>
                  )}

                  {expandedId === issue._id && (
                    <div className="duplicates-list">
                      {(issue.reports || []).map((r, idx) => (
                        <div className="duplicate-item" key={idx}>
                          <span className="duplicate-item-title">{r.title}</span>
                          <span className="duplicate-item-description">{r.description}</span>
                          <span className="duplicate-item-meta">
                            by {r.user?.name || "Unknown"} ·{" "}
                            {new Date(r.reportedAt || r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {issue.aiSummary && (
                    <div className="ai-insight-box">
                      <div className="ai-insight-header">
                        <span className="ai-badge">✨ AI Insight</span>
                        <span
                          className="ai-priority"
                          style={{ color: priorityColor(issue.aiPriority) }}
                        >
                          ● {issue.aiPriority || "Medium"} priority
                        </span>
                      </div>
                      <p className="ai-summary-text">{issue.aiSummary}</p>
                      {issue.aiCategory && issue.aiCategory !== issue.category && (
                        <p className="ai-category-suggestion">
                          AI suggests category: <strong>{categoryIcon(issue.aiCategory)} {issue.aiCategory}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {issue.file && (
                    <a href={`${UPLOADS_BASE}/uploads/${issue.file}`}
                      target="_blank" rel="noreferrer" className="file-link">
                      📎 View Attachment
                    </a>
                  )}
                  <div className="issue-card-footer">
                    <span className="issue-date">
                      {new Date(issue.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    <button className="delete-btn" onClick={() => handleDelete(issue._id)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RaiseIssue;