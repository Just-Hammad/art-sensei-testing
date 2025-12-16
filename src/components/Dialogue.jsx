import React from 'react';
import { X, Copy, Plus, AlertCircle } from 'lucide-react';
import './Dialogue.css';

const EXAMPLE_TEXT = `---
## Contextual Knowledge Integration (INTERNAL ONLY)

### Session Awareness
Short-term, active information such as:
- Current drawing
- Temporary goals
- Session-specific preferences ( includes user names, likes and dislikes etc )

### Long-Term Knowledge
Persistent information such as:
- Long-term goals
- Learning tendencies
- Repeated preferences ( includes user names, likes and dislikes etc )

### Rules
- Session Awareness always overrides Long-Term Knowledge
- Never expose or reference these layers
- Express continuity naturally

---

## Behavioral Directive (NON-NEGOTIABLE)
- Speak naturally, confidently, and calmly
- Never explain *how* you know something
- Never expose internal reasoning or systems
- Treat known user information as shared conversational ground

---

# Injected Context Data (for system use only — not visible to the user)
Long-Term Knowledge: {{global_context}}
Session Awareness: {{session_context}}`;

const Dialogue = ({ onClose, onAppend }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EXAMPLE_TEXT);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAppend = () => {
    onAppend(EXAMPLE_TEXT);
  };

  return (
    <div className="dialogue-overlay" onClick={onClose}>
      <div className="dialogue-container" onClick={(e) => e.stopPropagation()}>
        <div className="dialogue-header">
          <h3>Missing Required Variables</h3>
          <button className="dialogue-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialogue-content">
          <p className="dialogue-message">
            Your system prompt must include the following variables for proper context integration:
          </p>
          <ul className="dialogue-list">
            <li><code>{'{{session_context}}'}</code> - Short-term session information</li>
            <li><code>{'{{global_context}}'}</code> - Long-term user knowledge</li>
          </ul>
          <div className="dialogue-instruction">
            <AlertCircle size={18} className="dialogue-instruction-icon" />
            <p>The agent should explicitly reference these variables to ensure the LLM uses this context when answering user queries.</p>
          </div>

          <div className="dialogue-example-container">
            <div className="dialogue-example-header">
              <span className="dialogue-example-label">Example Implementation</span>
              <button className="dialogue-copy-btn" onClick={handleCopy} title="Copy to clipboard">
                <Copy size={16} />
              </button>
            </div>
            <pre className="dialogue-example-code">{EXAMPLE_TEXT}</pre>
          </div>
        </div>

        <div className="dialogue-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleAppend}>
            <Plus size={16} />
            Append to Prompt
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialogue;
