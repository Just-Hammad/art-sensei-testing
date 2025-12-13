import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useConversation } from '@elevenlabs/react';
import { Send, Image as ImageIcon, Settings, Save, RefreshCw, BookOpen, CheckSquare, Square, Edit2, Trash2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import './App.css';
import MemoryViewer from './components/MemoryViewer';
import { fetchSessionMemories, fetchGlobalMemories, clearMemoryCache } from './services/memoryService';
import { TEST_USER_ID, TEST_SESSION_ID } from './constants';

// Default Config
const DEFAULT_BACKEND = "https://mvp-backend-production-4c8b.up.railway.app";
// NOTE: For Admin updates, we go direct to ElevenLabs API to avoid needing backend endpoints for it


function App() {
  // --- STATE ---
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  // Security Update: Use sessionStorage (clears when tab closes) instead of localStorage
  const [apiKey, setApiKey] = useState(sessionStorage.getItem("xi-api-key") || import.meta.env.VITE_ELEVENLABS_API_KEY || "");
  const [agentId, setAgentId] = useState(sessionStorage.getItem("xi-agent-id") || import.meta.env.VITE_AGENT_ID || "");
  const [configAgentName, setConfigAgentName] = useState("");
  const [isFetchingAgentName, setIsFetchingAgentName] = useState(false);
  const [isHoveringAgentName, setIsHoveringAgentName] = useState(false);

  // UI State
  const [showApiKey, setShowApiKey] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [agentName, setAgentName] = useState("");
  const messagesEndRef = useRef(null);

  // Admin State
  const [systemPrompt, setSystemPrompt] = useState("");


  const [availableKBs, setAvailableKBs] = useState([]);
  const [selectedKBMap, setSelectedKBMap] = useState({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const [editingKB, setEditingKB] = useState(null);
  const [kbContent, setKbContent] = useState("");
  const [isSavingKB, setIsSavingKB] = useState(false);

  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [memoryTab, setMemoryTab] = useState('session');
  const [sessionMemories, setSessionMemories] = useState([]);
  const [globalMemories, setGlobalMemories] = useState([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [hasLoadedMemoriesOnce, setHasLoadedMemoriesOnce] = useState(false);

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
      if (role === 'assistant') {
        setIsWaitingForResponse(false);
      }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Client Tools State
  const [activeImage, setActiveImage] = useState(null);
  const [highlight, setHighlight] = useState(null);
    
  const loadMemories = async () => {
    // Only show loading state on the first fetch
    if (!hasLoadedMemoriesOnce) {
      setIsLoadingMemories(true);
    }
    try {
      const [sessionData, globalData] = await Promise.all([
        fetchSessionMemories(TEST_SESSION_ID, TEST_USER_ID),
        fetchGlobalMemories(TEST_USER_ID)
      ]);
      
      // Always update memories (background updates won't show loading)
      setSessionMemories(sessionData.memories || []);
      setGlobalMemories(globalData.memories || []);
      
      // Mark as loaded after first successful fetch
      if (!hasLoadedMemoriesOnce) {
        setHasLoadedMemoriesOnce(true);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      // Don't clear existing memories on error
    } finally {
      // Only clear loading state on first fetch
      if (!hasLoadedMemoriesOnce) {
        setIsLoadingMemories(false);
      }
    }
  };
  
  // --- ACTIONS ---
  const fetchAgentName = async () => {
    try {
      console.log(`[Agent Info] Fetching agent details for agent ID: ${agentId}`);
      const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey }
      });
      
      const agentData = response.data;
      const fetchedName = agentData.name || "Unknown Agent";
      
      console.log(`[Agent Info] Successfully fetched agent name: ${fetchedName}`);
      console.log(`[Agent Info] Full agent data:`, agentData);
      
      setAgentName(fetchedName);
      return fetchedName;
    } catch (error) {
      console.error(`[Agent Info] Failed to fetch agent details:`, error);
      setAgentName("Unknown Agent");
      return "Unknown Agent";
    }
  };

  const handleConnect = async () => {
    if (!agentId) return alert("Please enter an Agent ID first");

    setConnectionStatus("connecting");
    try {
      console.log(`[Connect] Starting connection process for agent: ${agentId}`);
      
      // Fetch agent name first
      const fetchedAgentName = await fetchAgentName();
      console.log(`[Connect] Agent name retrieved: ${fetchedAgentName}`);
      
      // Get signed URL
      console.log(`[Connect] Fetching signed URL from backend...`);
      const resp = await axios.get(`${backendUrl}/api/v1/elevenlabs/get-signed-url?text_mode=true`, {
        headers: {
          'xi-api-key': apiKey,
          'xi-agent-id': agentId
        }
      });
      const { signedUrl: url } = resp.data;
      console.log(`[Connect] Signed URL obtained successfully`);

      // Start the conversation session
      console.log(`[Connect] Starting conversation session...`);
      await conversation.startSession({
        signedUrl: url,
        connectionType: "websocket",
        customLlmExtraBody: {
          chatId: TEST_SESSION_ID,
          userId: TEST_USER_ID,
        },
        dynamicVariables: {
          first_name: "User",
          session_context: "No prior session history.",
          global_context: "No long-term user knowledge available.",
        },
        clientTools: {
          showImageOnScreen: async ({ imagePath }) => {
            console.log("[ClientTool] showImageOnScreen:", imagePath);
            const finalUrl = imagePath.startsWith('http') || imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            setActiveImage({ url: finalUrl, title: imagePath });
            addSystemMessage(`📷 Showing Image: ${imagePath}`);
            return "Image displayed successfully";
          },
          pointObjectInImage: async ({ query }) => {
            console.log("[ClientTool] pointObjectInImage:", query);
            addSystemMessage(`🔍 Pointing at object: ${query}`);

            if (!activeImage) {
              return "No active image to point at.";
            }

            try {
              const response = await axios.post(`${backendUrl}/api/v1/vision/point`, {
                filename: activeImage.title,
                object: query,
                max_points: 1
              }, {
                headers: { 'xi-api-key': apiKey }
              });

              const { points, count } = response.data;
              if (count > 0 && points[0]) {
                const { x, y } = points[0];
                addSystemMessage(`✅ Found ${query} at [${x}, ${y}]`);
                setHighlight({ x, y, label: query });
                setTimeout(() => setHighlight(null), 5000);
                return `Found ${query} at coordinates ${x},${y}`;
              } else {
                return `Could not find ${query} in the image.`;
              }
            } catch (err) {
              console.error("Vision API Error:", err);
              return `Failed to point: ${err.message}`;
            }
          }
        }
      });

      console.log(`[Connect] Session started successfully with agent: ${fetchedAgentName}`);

    } catch (err) {
      console.error("[Connect] Error:", err);
      setConnectionStatus("error");
      addSystemMessage(`Connection Failed: ${err.message}`);
      setAgentName(""); // Clear agent name on error
    }
  };

  const handleDisconnect = async () => {
    console.log(`[Disconnect] Disconnecting from agent: ${agentName}`);
    await conversation.endSession();
    setActiveImage(null);
    setAgentName(""); // Clear agent name on disconnect
    console.log(`[Disconnect] Successfully disconnected`);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    if (connectionStatus !== 'connected') {
      console.error("Cannot send message: Not connected to ElevenLabs");
      return;
    }
    
    try {
      addMessage('user', inputText);
      setInputText("");
      setIsWaitingForResponse(true);
      
      await conversation.sendUserMessage(inputText);
    } catch (error) {
      console.error("Failed to send message:", error);
      addSystemMessage(`Failed to send message: ${error.message}`);
      setIsWaitingForResponse(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // --- ADMIN & KB ACTIONS ---

  const loadConfig = async () => {
    if (!apiKey || !agentId) return alert("API Key and Agent ID required");
    setIsLoadingConfig(true);
    try {
      console.log(`[DEBUG] Loading Config for Agent: ${agentId}`);
      console.log(`[DEBUG] Using API Key: ${apiKey ? apiKey.substring(0, 5) + "..." : "MISSING"}`);
      // 1. Fetch Agent Details
      const agentResp = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey }
      });
      const config = agentResp.data.conversation_config?.agent;
      setSystemPrompt(config?.prompt?.prompt || "");

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
              prompt: systemPrompt
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

  const handleRenameKB = async (id, newName) => {
    try {
      await axios.patch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${id}`, {
        name: newName
      }, {
        headers: { 'xi-api-key': apiKey }
      });
      alert("Renamed successfully!");
      // Update local state
      setSelectedKBMap(prev => {
        const next = { ...prev };
        if (next[id]) next[id].name = newName;
        return next;
      });
      refreshKBList();
    } catch (e) {
      alert("Failed to rename: " + e.message);
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
    scrollToBottom();
  }, [messages, isWaitingForResponse]);

  useEffect(() => {
    sessionStorage.setItem("xi-api-key", apiKey);
    sessionStorage.setItem("xi-agent-id", agentId);
  }, [apiKey, agentId]);

  useEffect(() => {
    setConfigAgentName("");
    
    if (!agentId || !apiKey) {
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsFetchingAgentName(true);
      try {
        const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
          headers: { 'xi-api-key': apiKey }
        });
        const agentData = response.data;
        const fetchedName = agentData.name || "";
        setConfigAgentName(fetchedName);
      } catch (error) {
        console.error('Failed to fetch agent name:', error);
        setConfigAgentName("");
      } finally {
        setIsFetchingAgentName(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [agentId, apiKey]);

  useEffect(() => {
    loadMemories();

    const pollingInterval = setInterval(() => {
      loadMemories();
    }, 8000);

    return () => {
      clearInterval(pollingInterval);
      clearMemoryCache();
    };
  }, []);

  return (
    <div className="app-container">

      {/* COLUMN 1: CHAT (Left) */}
      <div className="panel chat-panel">
        <div className="header">
          <h2 className="header-title">
            <div className={`status-dot ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'connecting' : 'disconnected'}`} />
            {connectionStatus === 'connected' && agentName ? (
              <span className="agent-name-badge">{agentName}</span>
            ) : (
              'Chat'
            )}
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
          {isWaitingForResponse && (
            <div className="message-row assistant">
              <div className="marcel-loading">
                <span className="marcel-name">Marcel</span>
                <div className="loading-dots">
                  <span className="dot" style={{ animationDelay: '0ms' }}></span>
                  <span className="dot" style={{ animationDelay: '150ms' }}></span>
                  <span className="dot" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>



        {activeImage && (
          <div className="image-preview-overlay">
            <div className="image-card">
              <img src={activeImage.url} alt={activeImage.title} />
              {highlight && (
                <div style={{
                  position: 'absolute',
                  left: `${highlight.x * 100}%`,
                  top: `${highlight.y * 100}%`,
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'rgba(255, 0, 0, 0.5)',
                  border: '2px solid red',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  boxShadow: '0 0 10px rgba(255,0,0,0.8)'
                }} />
              )}
              <div className="image-caption">{activeImage.title}</div>
              <button className="close-btn" onClick={() => setActiveImage(null)}>×</button>
            </div>
          </div>
        )}

        <div className="input-area" id="chat-input-area">
          <button className="btn-icon"><ImageIcon size={20} /></button>
          <input
            id="chat-input"
            className="msg-input"
            placeholder="Message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={connectionStatus !== 'connected'}
          />
          <button onClick={handleSend} disabled={connectionStatus !== 'connected' || !inputText.trim()} className="btn-primary" id="send-btn">
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
                  <Save size={16} /> UPDATE AGENT SETTINGS
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

            <MemoryViewer
              isExpanded={memoryExpanded}
              onToggle={() => setMemoryExpanded(!memoryExpanded)}
              activeTab={memoryTab}
              onTabChange={setMemoryTab}
              sessionMemories={sessionMemories}
              globalMemories={globalMemories}
              isLoading={isLoadingMemories}
              sessionId={TEST_SESSION_ID}
              userId={TEST_USER_ID}
            />
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
                <label className="form-label">Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={editingKB.name}
                    onChange={e => setEditingKB({ ...editingKB, name: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => handleRenameKB(editingKB.id, editingKB.name)} className="btn-black" style={{ padding: '8px 12px' }}>
                    Rename
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ID</label>
                <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{editingKB.id}</code>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <span className="badge">{editingKB.type}</span>
              </div>
              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Content (Read-Only Preview)</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Agent ID</label>
              {configAgentName && (
                <span 
                  className="config-agent-name" 
                  onMouseEnter={() => setIsHoveringAgentName(true)}
                  onMouseLeave={() => setIsHoveringAgentName(false)}
                  style={{
                    fontSize: '10px',
                    color: '#64748b',
                    maxWidth: isHoveringAgentName ? 'none' : '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'default',
                    transition: 'max-width 0.2s ease'
                  }}
                >
                  {isHoveringAgentName ? configAgentName : (configAgentName.length > 25 ? configAgentName.slice(0, 25) + '...' : configAgentName)}
                </span>
              )}
              {isFetchingAgentName && (
                <div className="spinner-sm"></div>
              )}
            </div>
            <input value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="agent-id" />
          </div>

          <button
            className="btn-black"
            style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            onClick={() => {
              sessionStorage.setItem("xi-api-key", apiKey);
              sessionStorage.setItem("xi-agent-id", agentId);
              alert("Credentials saved to session!");
            }}
          >
            Set Credentials
          </button>

          <div className="separator" style={{ height: '1px', background: '#e2e8f0', margin: '15px 0' }} />

          {/* Non-functional LLM Fields */}
          <div className="form-group" style={{ opacity: 0.6 }}>
            <label className="form-label">Service (Managed by Agent)</label>
            <select disabled style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <option>Default Provider</option>
            </select>
          </div>
          <div className="form-group" style={{ opacity: 0.6 }}>
            <label className="form-label">Model ID (Managed by Agent)</label>
            <input disabled placeholder="Managed by Agent Settings" style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
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
    </div >
  )
}

export default App;
