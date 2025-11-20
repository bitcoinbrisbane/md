import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./MarkdownEditor.css";

function MarkdownEditor() {
  const [markdown, setMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Chapter management
  const [chapters, setChapters] = useState([]);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterDescription, setNewChapterDescription] = useState("");

  // GitHub settings
  const [githubToken, setGithubToken] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoBranch, setRepoBranch] = useState("master");
  const [filePath, setFilePath] = useState("book.md");
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Sync chapters from GitHub repository
  const syncChaptersFromGitHub = useCallback(async (token, owner, repo, branch = "master") => {
    if (!token || !owner || !repo) {
      return;
    }

    setLoadingChapters(true);
    try {
      // Get repository contents at root level with specific branch
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/?ref=${branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch repository contents:", response.status, response.statusText);
        setSaveMessage(`✗ Error loading chapters: ${response.status} ${response.statusText}`);
        setTimeout(() => setSaveMessage(""), 5000);
        return;
      }

      const contents = await response.json();

      // Filter for chapter folders (chap_01, chap_02, etc.)
      const chapterFolders = contents.filter(
        (item) =>
          item.type === "dir" && /^chap_\d{2}$/.test(item.name)
      );

      if (chapterFolders.length === 0) {
        console.log("No chapter folders found in repository");
        return;
      }

      // Fetch each chapter's markdown file
      const chapterPromises = chapterFolders.map(async (folder) => {
        try {
          // Get folder contents
          const folderResponse = await fetch(folder.url, {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (!folderResponse.ok) return null;

          const folderContents = await folderResponse.json();

          // Find the markdown file
          const mdFile = folderContents.find((file) =>
            file.name.endsWith(".md")
          );

          if (!mdFile) return null;

          // Fetch the file content
          const fileResponse = await fetch(mdFile.url, {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (!fileResponse.ok) return null;

          const fileData = await fileResponse.json();
          const content = atob(fileData.content); // Decode base64

          // Extract chapter number from folder name (chap_01 -> 1)
          const chapterNumber = parseInt(folder.name.split("_")[1], 10);

          // Extract chapter name from first heading or filename
          const nameMatch = content.match(/^#\s+(.+)$/m);
          const chapterName = nameMatch
            ? nameMatch[1]
            : mdFile.name.replace(".md", "").replace(/-/g, " ");

          // Extract description from content (second line if it exists)
          const lines = content.split("\n").filter((line) => line.trim());
          const description = lines.length > 1 && !lines[1].startsWith("#")
            ? lines[1]
            : "";

          return {
            id: `github-${folder.name}-${mdFile.name}`,
            number: chapterNumber,
            name: chapterName,
            description: description,
            folderName: folder.name,
            fileName: mdFile.name.replace(".md", ""),
            filePath: `${folder.name}/${mdFile.name}`,
            content: content,
          };
        } catch (error) {
          console.error(`Error fetching chapter ${folder.name}:`, error);
          return null;
        }
      });

      const fetchedChapters = (await Promise.all(chapterPromises))
        .filter((ch) => ch !== null)
        .sort((a, b) => a.number - b.number);

      if (fetchedChapters.length > 0) {
        // Update chapters state and localStorage
        setChapters(fetchedChapters);
        localStorage.setItem("chapters", JSON.stringify(fetchedChapters));

        // Select first chapter if none is currently selected
        if (!currentChapterId && fetchedChapters.length > 0) {
          setCurrentChapterId(fetchedChapters[0].id);
          setMarkdown(fetchedChapters[0].content || "");
          setFilePath(fetchedChapters[0].filePath);
          localStorage.setItem("current_chapter_id", fetchedChapters[0].id);
        }

        console.log(`Loaded ${fetchedChapters.length} chapters from GitHub`);
      }
    } catch (error) {
      console.error("Error syncing chapters from GitHub:", error);
    } finally {
      setLoadingChapters(false);
    }
  }, [currentChapterId]);

  // Load settings and chapters from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("github_token");
    const savedOwner = localStorage.getItem("repo_owner");
    const savedRepo = localStorage.getItem("repo_name");
    const savedBranch = localStorage.getItem("repo_branch");
    const savedPath = localStorage.getItem("file_path");
    const savedChapters = localStorage.getItem("chapters");
    const savedCurrentChapter = localStorage.getItem("current_chapter_id");

    if (savedToken) setGithubToken(savedToken);
    if (savedOwner) setRepoOwner(savedOwner);
    if (savedRepo) setRepoName(savedRepo);
    if (savedBranch) setRepoBranch(savedBranch);
    if (savedPath) setFilePath(savedPath);

    // First load from localStorage
    if (savedChapters) {
      const parsedChapters = JSON.parse(savedChapters);
      setChapters(parsedChapters);

      if (savedCurrentChapter) {
        const currentChapter = parsedChapters.find(
          (ch) => ch.id === savedCurrentChapter
        );
        if (currentChapter) {
          setCurrentChapterId(savedCurrentChapter);
          setMarkdown(currentChapter.content || "");
          setFilePath(currentChapter.filePath);
        }
      } else if (parsedChapters.length > 0) {
        // Select first chapter if no saved current chapter
        setCurrentChapterId(parsedChapters[0].id);
        setMarkdown(parsedChapters[0].content || "");
        setFilePath(parsedChapters[0].filePath);
      }
    }

    // Then sync from GitHub if credentials are available
    if (savedToken && savedOwner && savedRepo) {
      syncChaptersFromGitHub(savedToken, savedOwner, savedRepo, savedBranch || "master");
    }
  }, [syncChaptersFromGitHub]);

  const handleChange = (e) => {
    setMarkdown(e.target.value);
    // Update current chapter content
    if (currentChapterId) {
      const updatedChapters = chapters.map((ch) =>
        ch.id === currentChapterId ? { ...ch, content: e.target.value } : ch
      );
      setChapters(updatedChapters);
      localStorage.setItem("chapters", JSON.stringify(updatedChapters));
    }
  };

  const createChapter = () => {
    if (!newChapterName.trim()) {
      alert("Please enter a chapter name");
      return;
    }

    const chapterNumber = chapters.length + 1;
    const folderName = `chap_${String(chapterNumber).padStart(2, "0")}`;
    const fileName = newChapterName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const newFilePath = `${folderName}/${fileName}.md`;

    const newChapter = {
      id: Date.now().toString(),
      number: chapterNumber,
      name: newChapterName,
      description: newChapterDescription,
      folderName: folderName,
      fileName: fileName,
      filePath: newFilePath,
      content: `# ${newChapterName}\n\n${newChapterDescription ? newChapterDescription + "\n\n" : ""}Start writing your chapter here...`,
    };

    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);
    localStorage.setItem("chapters", JSON.stringify(updatedChapters));

    // Switch to the new chapter
    setCurrentChapterId(newChapter.id);
    setMarkdown(newChapter.content);
    setFilePath(newChapter.filePath);
    localStorage.setItem("current_chapter_id", newChapter.id);

    // Close modal and reset form
    setShowNewChapterModal(false);
    setNewChapterName("");
    setNewChapterDescription("");
  };

  const selectChapter = (chapterId) => {
    const chapter = chapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      setCurrentChapterId(chapterId);
      setMarkdown(chapter.content || "");
      setFilePath(chapter.filePath);
      localStorage.setItem("current_chapter_id", chapterId);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("github_token", githubToken);
    localStorage.setItem("repo_owner", repoOwner);
    localStorage.setItem("repo_name", repoName);
    localStorage.setItem("repo_branch", repoBranch);
    localStorage.setItem("file_path", filePath);
    setShowSettingsModal(false);
    setSaveMessage("Settings saved! Syncing chapters...");

    // Trigger chapter sync after saving settings
    if (githubToken && repoOwner && repoName) {
      syncChaptersFromGitHub(githubToken, repoOwner, repoName, repoBranch);
    }

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

  const currentChapter = chapters.find((ch) => ch.id === currentChapterId);

  return (
    <div className="app-container">
      {/* Left Sidebar - Chapter Menu */}
      <div className="chapter-sidebar">
        <div className="sidebar-header">
          <h3>Chapters</h3>
          <div className="sidebar-actions">
            <button
              className="sync-btn"
              onClick={() => syncChaptersFromGitHub(githubToken, repoOwner, repoName, repoBranch)}
              disabled={loadingChapters || !githubToken || !repoOwner || !repoName}
              title="Sync chapters from GitHub"
            >
              🔄
            </button>
            <button
              className="new-chapter-btn"
              onClick={() => setShowNewChapterModal(true)}
              title="Add New Chapter"
            >
              + New
            </button>
          </div>
        </div>
        <div className="chapter-list">
          {loadingChapters && (
            <div className="loading-chapters">
              <p>Loading chapters from GitHub...</p>
            </div>
          )}
          {!loadingChapters && chapters.length === 0 ? (
            <div className="no-chapters">
              <p>No chapters yet</p>
              <small>Click &quot;+ New&quot; to create your first chapter</small>
            </div>
          ) : (
            chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`chapter-item ${currentChapterId === chapter.id ? "active" : ""}`}
                onClick={() => selectChapter(chapter.id)}
              >
                <div className="chapter-number">Ch. {chapter.number}</div>
                <div className="chapter-info">
                  <div className="chapter-name">{chapter.name}</div>
                  {chapter.description && (
                    <div className="chapter-description">{chapter.description}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Preview Panel - Top */}
        <div className="preview-panel flex-grow-1 overflow-auto bg-white p-4">
          <div className="preview-content">
            {currentChapter ? (
              <ReactMarkdown>{markdown}</ReactMarkdown>
            ) : (
              <div className="no-chapter-selected">
                <h2>Welcome to Your Book Writer</h2>
                <p>Create a new chapter to get started!</p>
              </div>
            )}
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
              <label htmlFor="repoBranch">Branch</label>
              <input
                type="text"
                id="repoBranch"
                className="form-control"
                value={repoBranch}
                onChange={(e) => setRepoBranch(e.target.value)}
                placeholder="master or main"
              />
              <small className="form-text">
                The branch where your chapters are stored
              </small>
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

      {/* New Chapter Modal */}
      {showNewChapterModal && (
        <div className="modal-overlay" onClick={() => setShowNewChapterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Chapter</h3>
            <p className="modal-description">
              Add a new chapter to your book.
            </p>

            <div className="form-group">
              <label htmlFor="chapterName">Chapter Name *</label>
              <input
                type="text"
                id="chapterName"
                className="form-control"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="e.g., The Beginning"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="chapterDescription">Description (optional)</label>
              <textarea
                id="chapterDescription"
                className="form-control"
                value={newChapterDescription}
                onChange={(e) => setNewChapterDescription(e.target.value)}
                placeholder="Brief description of what happens in this chapter..."
                rows="3"
              />
            </div>

            <div className="chapter-path-preview">
              <small>
                <strong>File path:</strong>{" "}
                {`chap_${String(chapters.length + 1).padStart(2, "0")}/${
                  newChapterName
                    ? newChapterName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "") || "untitled"
                    : "untitled"
                }.md`}
              </small>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewChapterModal(false);
                  setNewChapterName("");
                  setNewChapterDescription("");
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createChapter}>
                Create Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
