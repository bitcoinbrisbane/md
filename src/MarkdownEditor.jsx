import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./MarkdownEditor.css";

function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(`# Welcome to Your Book Writer

Start typing your book here...

## Chapter 1

Write your story using **markdown** formatting:
- *Italic text*
- **Bold text**
- ***Bold and italic***

### Lists
1. First item
2. Second item
3. Third item

> This is a quote

\`\`\`
Code blocks are supported too!
\`\`\`

Happy writing!`);

  const [activeTab, setActiveTab] = useState("write");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // GitHub settings
  const [githubToken, setGithubToken] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [filePath, setFilePath] = useState("book.md");

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("github_token");
    const savedOwner = localStorage.getItem("repo_owner");
    const savedRepo = localStorage.getItem("repo_name");
    const savedPath = localStorage.getItem("file_path");

    if (savedToken) setGithubToken(savedToken);
    if (savedOwner) setRepoOwner(savedOwner);
    if (savedRepo) setRepoName(savedRepo);
    if (savedPath) setFilePath(savedPath);
  }, []);

  const handleChange = (e) => {
    setMarkdown(e.target.value);
  };

  const saveSettings = () => {
    localStorage.setItem("github_token", githubToken);
    localStorage.setItem("repo_owner", repoOwner);
    localStorage.setItem("repo_name", repoName);
    localStorage.setItem("file_path", filePath);
    setShowSettingsModal(false);
    setSaveMessage("Settings saved!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleSave = async () => {
    // Check if settings are configured
    if (!githubToken || !repoOwner || !repoName || !filePath) {
      setShowSettingsModal(true);
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      // First, get the current file SHA if it exists
      const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
      let sha = null;

      try {
        const getResponse = await fetch(getUrl, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (getResponse.ok) {
          const data = await getResponse.json();
          sha = data.sha;
        }
      } catch {
        // File doesn't exist yet, which is fine
        console.log("File doesn't exist yet, will create new file");
      }

      // Create or update the file
      const putUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
      const message = sha ? "Update book content" : "Create book content";

      const putResponse = await fetch(putUrl, {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          content: btoa(unescape(encodeURIComponent(markdown))), // Base64 encode
          sha: sha,
        }),
      });

      if (!putResponse.ok) {
        const errorData = await putResponse.json();
        throw new Error(errorData.message || "Failed to save to GitHub");
      }

      setSaveMessage("✓ Saved to GitHub successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage(`✗ Error: ${error.message}`);
      setTimeout(() => setSaveMessage(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0">
      {/* Preview Panel - Top */}
      <div className="preview-panel flex-grow-1 overflow-auto bg-white p-4">
        <div className="preview-content">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>

      {/* Editor Panel - Bottom - GitHub style */}
      <div className="editor-panel bg-light p-3">
        <div className="github-comment-box">
          {/* Tabs and Save Button */}
          <div className="comment-tabs">
            <div className="tabs-left">
              <button
                className={`tab-btn ${activeTab === "write" ? "active" : ""}`}
                onClick={() => setActiveTab("write")}
              >
                Write
              </button>
              <button
                className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
                onClick={() => setActiveTab("preview")}
              >
                Preview
              </button>
            </div>
            <div className="tabs-right">
              <button
                className="settings-btn"
                onClick={() => setShowSettingsModal(true)}
                title="GitHub Settings"
              >
                ⚙️
              </button>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to GitHub"}
              </button>
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes("✗") ? "error" : "success"}`}>
              {saveMessage}
            </div>
          )}

          {/* Content Area */}
          <div className="comment-content">
            {activeTab === "write" ? (
              <textarea
                className="comment-textarea"
                value={markdown}
                onChange={handleChange}
                placeholder="Write your book content here... (Markdown supported)"
              />
            ) : (
              <div className="comment-preview">
                <ReactMarkdown>{markdown || "*Nothing to preview*"}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="comment-footer">
            <small className="text-muted">
              Styling with Markdown is supported
            </small>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>GitHub Settings</h3>
            <p className="modal-description">
              Configure your GitHub repository details to save your work.
            </p>

            <div className="form-group">
              <label htmlFor="githubToken">GitHub Personal Access Token</label>
              <input
                type="password"
                id="githubToken"
                className="form-control"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              <small className="form-text">
                Create a token at{" "}
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/settings/tokens
                </a>{" "}
                with <code>repo</code> scope
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="repoOwner">Repository Owner</label>
              <input
                type="text"
                id="repoOwner"
                className="form-control"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="username or organization"
              />
            </div>

            <div className="form-group">
              <label htmlFor="repoName">Repository Name</label>
              <input
                type="text"
                id="repoName"
                className="form-control"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-book-repo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="filePath">File Path</label>
              <input
                type="text"
                id="filePath"
                className="form-control"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="book.md or chapters/chapter1.md"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveSettings}>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
