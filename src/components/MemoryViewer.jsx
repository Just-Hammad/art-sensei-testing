import React from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

const MemoryViewer = ({ 
  isExpanded, 
  onToggle, 
  activeTab, 
  onTabChange,
  sessionMemories,
  globalMemories,
  isLoading,
  sessionId,
  userId
}) => {
  const renderMemoryItem = (memory, index) => {
    const memoryContent = typeof memory === 'string' ? memory : (memory.memory || memory.content || JSON.stringify(memory));
    const memoryId = memory.id || index;
    
    return (
      <div key={memoryId} className="memory-item">
        <div className="memory-content">{memoryContent}</div>
      </div>
    );
  };

  return (
    <div className={`memory-viewer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="memory-header" onClick={onToggle}>
        <div className="memory-title">
          <Brain size={18} />
          <span>Memory Context</span>
          <span className="memory-ids" title={`User ID: ${userId} | Session ID: ${sessionId}`}>
            <span title={`User ID: ${userId}`}>U</span> · <span title={`Session ID: ${sessionId}`}>S</span>
          </span>
        </div>
        {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </div>

      {isExpanded && (
        <div className="memory-body">

          <div className="memory-tabs">
            <button
              className={`memory-tab ${activeTab === 'session' ? 'active' : ''}`}
              onClick={() => onTabChange('session')}
            >
              Session Memories
              {sessionMemories.length > 0 && (
                <span className="memory-count">{sessionMemories.length}</span>
              )}
            </button>
            <button
              className={`memory-tab ${activeTab === 'global' ? 'active' : ''}`}
              onClick={() => onTabChange('global')}
            >
              Global Memories
              {globalMemories.length > 0 && (
                <span className="memory-count">{globalMemories.length}</span>
              )}
            </button>
          </div>

          <div className="memory-content-area">
            {activeTab === 'session' && (
              <div className="memory-list">
                {isLoading && sessionMemories.length === 0 ? (
                  <div className="memory-loading">Loading memories...</div>
                ) : sessionMemories.length > 0 ? (
                  sessionMemories.map((memory, index) => renderMemoryItem(memory, index))
                ) : (
                  <div className="memory-empty">No session memories yet</div>
                )}
              </div>
            )}
            {activeTab === 'global' && (
              <div className="memory-list">
                {isLoading && globalMemories.length === 0 ? (
                  <div className="memory-loading">Loading memories...</div>
                ) : globalMemories.length > 0 ? (
                  globalMemories.map((memory, index) => renderMemoryItem(memory, index))
                ) : (
                  <div className="memory-empty">No global memories yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryViewer;
