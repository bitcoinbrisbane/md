import { useState } from "react";
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

  const handleChange = (e) => {
    setMarkdown(e.target.value);
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
          {/* Tabs */}
          <div className="comment-tabs">
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
  );
}

export default MarkdownEditor;
