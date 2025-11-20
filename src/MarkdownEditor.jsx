import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './MarkdownEditor.css'

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

Happy writing!`)

  const handleChange = (e) => {
    setMarkdown(e.target.value)
  }

  return (
    <div className="container-fluid vh-100 d-flex flex-column p-0">
      {/* Preview Panel - Top */}
      <div className="preview-panel flex-grow-1 overflow-auto bg-white p-4">
        <div className="preview-content">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>

      {/* Editor Panel - Bottom */}
      <div className="editor-panel bg-light border-top">
        <textarea
          className="form-control border-0 bg-light"
          value={markdown}
          onChange={handleChange}
          placeholder="Start writing your book here..."
          style={{
            resize: 'none',
            height: '250px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
        />
      </div>
    </div>
  )
}

export default MarkdownEditor
