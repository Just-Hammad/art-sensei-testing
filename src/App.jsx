import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useConversation } from '@elevenlabs/react';
import { Mic, Send, Image as ImageIcon, Settings, Save, RefreshCw, BookOpen, CheckSquare, Square, Edit2, Trash2, ArrowLeft, Plus, Eye, EyeOff } from 'lucide-react';
import './App.css'; // Import the new CSS

// Default Config
const DEFAULT_BACKEND = "https://mvp-backend-production-4c8b.up.railway.app";
// NOTE: For Admin updates, we go direct to ElevenLabs API to avoid needing backend endpoints for it


function App() {
  // --- STATE ---
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  // Security Update: Use sessionStorage (clears when tab closes) instead of localStorage
  const [apiKey, setApiKey] = useState(sessionStorage.getItem("xi-api-key") || import.meta.env.VITE_ELEVENLABS_API_KEY || "");
  const [agentId, setAgentId] = useState(sessionStorage.getItem("xi-agent-id") || import.meta.env.VITE_AGENT_ID || "");

  // UI State
  const [showApiKey, setShowApiKey] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Admin State
  const [systemPrompt, setSystemPrompt] = useState("");
  const [llmProvider, setLlmProvider] = useState("openai");
  const [llmModel, setLlmModel] = useState("gpt-4o");

  const [availableKBs, setAvailableKBs] = useState([]);
  const [selectedKBMap, setSelectedKBMap] = useState({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // KB Editor State
  const [editingKB, setEditingKB] = useState(null);
  const [kbContent, setKbContent] = useState("");
  const [isSavingKB, setIsSavingKB] = useState(false);

  // --- ELEVENLABS HOOK ---
  const conversation = useConversation({
    onConnect: () => {
      setConnectionStatus("connected");
      addSystemMessage("Agent Connected!");
    },
    onDisconnect: () => {
      setConnectionStatus("disconnected");
      addSystemMessage("Agent Disconnected.");
    },
    onMessage: (message) => {
      console.log("Msg:", message);
      const role = message.source === 'user' ? 'user' : 'assistant';
      const text = message.message || "";
      addMessage(role, text);
    },
    onError: (err) => {
      console.error(err);
      addSystemMessage(`Error: ${err.message}`);
      setConnectionStatus("error");
    }
  });

  // --- HELPERS ---
  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { role: 'system', content: text, timestamp: new Date() }]);
  };

  // --- ACTIONS ---

  const handleConnect = async () => {
    if (!agentId) return alert("Please enter an Agent ID first");

    setConnectionStatus("connecting");
    try {
      const resp = await axios.get(`${backendUrl}/api/v1/elevenlabs/get-signed-url?text_mode=true`);
      const { signedUrl: url } = resp.data;

      await conversation.startSession({
        signedUrl: url,
        dynamicVariables: {
          first_name: "User",
        }
      });

    } catch (err) {
      console.error(err);
      setConnectionStatus("error");
      addSystemMessage(`Connection Failed: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    await conversation.endSession();
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await conversation.sendUserMessage(inputText);
    setInputText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // --- ADMIN & KB ACTIONS ---

  const loadConfig = async () => {
    if (!apiKey || !agentId) return alert("API Key and Agent ID required");
    setIsLoadingConfig(true);
    try {
      // 1. Fetch Agent Details
      const agentResp = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey }
      });
      const config = agentResp.data.conversation_config?.agent;
      setSystemPrompt(config?.prompt?.prompt || "");

      // Load LLM if present
      if (config?.prompt?.llm) {
        const modelId = config.prompt.llm;
        setLlmModel(modelId);
        // Infer provider for UI
        if (modelId.startsWith('gemini')) setLlmProvider('gemini');
        else if (modelId.startsWith('claude')) setLlmProvider('anthropic');
        else setLlmProvider('openai');
      }

      const currentKBs = config?.knowledge_base || [];
      const currentKBMap = {};
      currentKBs.forEach(kb => { currentKBMap[kb.id] = kb; });
      setSelectedKBMap(currentKBMap);

      // 2. Fetch KBs
      await refreshKBList();

    } catch (err) {
      alert(`Failed to load config: ${err.message}`);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const refreshKBList = async () => {
    const kbResp = await axios.get(`https://api.elevenlabs.io/v1/convai/knowledge-base?page_size=100`, {
      headers: { 'xi-api-key': apiKey }
    });
    setAvailableKBs(kbResp.data.documents || []);
  };

  const saveConfig = async () => {
    if (!apiKey || !agentId) return;
    try {
      const kbList = Object.values(selectedKBMap).map(kb => ({
        id: kb.id,
        name: kb.name,
        type: kb.type
      }));

      await axios.patch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
              llm: llmModel
            },
            knowledge_base: kbList
          }
        }
      }, {
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }
      });
      alert("Agent Configuration Saved!");
    } catch (err) {
      alert(`Save Failed: ${err.message}`);
    }
  };

  const toggleKB = (kb) => {
    setSelectedKBMap(prev => {
      const next = { ...prev };
      if (next[kb.id]) delete next[kb.id];
      else next[kb.id] = { id: kb.id, name: kb.name, type: kb.type };
      return next;
    });
  };

  // --- KB EDITING ---

  const handleEditKB = async (kb) => {
    setEditingKB(kb);
    setKbContent("Loading content...");
    try {
      const resp = await axios.get(`https://api.elevenlabs.io/v1/convai/knowledge-base/${kb.id}`, {
        headers: { 'xi-api-key': apiKey }
      });
      const data = resp.data;
      if (data.extracted_inner_html) setKbContent(data.extracted_inner_html);
      else if (kb.type === 'url') setKbContent(data.url || "URL Document");
      else setKbContent("(Content not viewable via API)");
    } catch (e) {
      setKbContent("(Could not load content)");
    }
  };

  const handleDeleteKB = async (id) => {
    if (!confirm("Are you sure you want to delete this Knowledge Base document? This cannot be undone.")) return;
    try {
      await axios.delete(`https://api.elevenlabs.io/v1/convai/knowledge-base/${id}`, {
        headers: { 'xi-api-key': apiKey }
      });
      setSelectedKBMap(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingKB(null);
      await refreshKBList();
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };


  useEffect(() => {
    // Security: Save to sessionStorage only
    sessionStorage.setItem("xi-api-key", apiKey);
    sessionStorage.setItem("xi-agent-id", agentId);
  }, [apiKey, agentId]);

  return (
    <div className="app-container">

      {/* COLUMN 1: CHAT (Left) */}
      <div className="panel chat-panel">
        <div className="header">
          <h2 className="header-title">
            <div className={`status-dot ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'connecting' : 'disconnected'}`} />
            Chat
            {connectionStatus === 'connected' && <span className="status-badge">Live</span>}
          </h2>
          <div className="actions">
            {connectionStatus !== 'connected' ? (
              <button onClick={handleConnect} disabled={connectionStatus === 'connecting'} className="btn-black">
                {connectionStatus === 'connecting' ? '...' : 'Connect'}
              </button>
            ) : (
              <button onClick={handleDisconnect} className="btn-red">Stop</button>
            )}
          </div>
        </div>

        <div className="messages-list">
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className={`message-bubble ${msg.role}`}>{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="input-area">
          <button className="btn-icon"><ImageIcon size={20} /></button>
          <input
            className="msg-input"
            placeholder="Message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={connectionStatus !== 'connected'}
          />
          <button onClick={handleSend} disabled={connectionStatus !== 'connected' || !inputText.trim()} className="btn-primary">
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* COLUMN 2: EDITOR (Center, Main Focus) */}
      <div className="panel editor-panel">
        {!editingKB ? (
          <>
            <div className="header">
              <h3 className="header-title"><Settings size={18} /> System Prompt</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={loadConfig} disabled={isLoadingConfig} className="btn-icon">
                  <RefreshCw size={18} className={isLoadingConfig ? "spin" : ""} />
                </button>
                <button onClick={saveConfig} className="btn-primary">
                  <Save size={16} /> SAVE CHANGES
                </button>
              </div>
            </div>
            <textarea
              className="prompt-editor"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Load config to edit system prompt..."
            />
            <div className="char-count">{systemPrompt.length} chars</div>
          </>
        ) : (
          <>
            <div className="header">
              <h3 className="header-title">
                <BookOpen size={18} /> Edit: {editingKB.name}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDeleteKB(editingKB.id)} className="btn-red-outline">
                  <Trash2 size={16} /> Delete
                </button>
                <button onClick={() => setEditingKB(null)} className="btn-black">
                  <ArrowLeft size={16} /> Back
                </button>
              </div>
            </div>
            <div className="editor-content">
              <div className="form-group">
                <label className="form-label">ID</label>
                <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{editingKB.id}</code>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <span className="badge">{editingKB.type}</span>
              </div>
              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Content Preview</label>
                <div className="content-preview">
                  {kbContent}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* COLUMN 3: CONFIG (Far Right) */}
      <div className="config-panel">

        {/* Credentials & Model */}
        <div className="card">
          <div className="form-group">
            <label className="form-label">API Key</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="xi-..."
                style={{ flex: 1 }}
              />
              <button onClick={() => setShowApiKey(!showApiKey)} className="btn-icon">
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Agent ID</label>
            <input value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="agent-id" />
          </div>

          <div className="separator" style={{ height: '1px', background: '#e2e8f0', margin: '15px 0' }} />

          <div className="form-group">
            <label className="form-label">Service</label>
            <select
              value={llmProvider}
              onChange={e => setLlmProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                fontSize: '13px'
              }}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Model ID</label>
            <input
              value={llmModel}
              onChange={e => setLlmModel(e.target.value)}
              placeholder="e.g. gpt-4o"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                fontSize: '13px'
              }}
            />
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Must be a valid Model ID (e.g. <code>gpt-4o</code>)
            </div>
          </div>
        </div>

        {/* KB List */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="header-small" style={{ marginBottom: '10px' }}>
            <h3 className="header-title" style={{ fontSize: '0.85rem' }}>
              <BookOpen size={16} />
              Knowledge Base
            </h3>
            <span className="badge">{Object.keys(selectedKBMap).length} Active</span>
          </div>

          <div className="kb-list-container">
            {availableKBs.length === 0 && (
              <div style={{ padding: '10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                {isLoadingConfig ? "Loading..." : "No KBs found."}
              </div>
            )}
            {availableKBs.map(kb => {
              const isSelected = !!selectedKBMap[kb.id];
              return (
                <div key={kb.id} className={`kb-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleKB(kb)}>
                  {isSelected ? <CheckSquare size={16} className="text-blue-500" /> : <Square size={16} color="#cbd5e1" />}
                  <div className="kb-info">
                    <div className="kb-name">{kb.name}</div>
                    <div className="kb-type">{kb.type}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleEditKB(kb); }} className="btn-icon-sm">
                    <Edit2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App;
