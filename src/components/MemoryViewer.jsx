import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Brain, Trash2, Loader2, X } from 'lucide-react';

const MemoryViewer = ({
  isExpanded,
  onToggle,
  activeTab,
  onTabChange,
  sessionMemories,
  globalMemories,
  isLoading,
  sessionId,
  userId,
  onDeleteMemory
}) => {
  const [deletingMemoryId, setDeletingMemoryId] = useState(null);
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const dismissToast = (e) => {
    if (e) e.stopPropagation();
    setToast(prev => ({ ...prev, visible: false }));
  };

  const handleDeleteClick = async (memory, memoryType) => {
    console.log("[MEMORY VIEWER] Memory to delete=> ", memory)
    const memoryContent = memory.memory || memory.content || JSON.stringify(memory);
    const confirmMessage = `Are you sure you want to delete this memory?\n\n"${memoryContent.substring(0, 100)}${memoryContent.length > 100 ? '...' : ''}"`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const memoryId = memory.id;
    if (!memoryId) {
      console.error('[MEMORY VIEWER] No memory ID found');
      return;
    }

    setDeletingMemoryId(memoryId);

    try {
      const result = await onDeleteMemory(memoryId, memoryType);
      console.log('[MEMORY VIEWER] Delete memory response:', result);
    } catch (error) {
      console.error('[MEMORY VIEWER] Delete memory error:', error);
    } finally {
      setDeletingMemoryId(null);
      showToast('Memory deleted successfully');
    }
  };

  const renderMemoryItem = (memory, index, memoryType) => {
    const memoryContent = memory.memory || memory.content || JSON.stringify(memory);
    const memoryId = memory.id || index;
    const isDeleting = deletingMemoryId === memoryId;

    return (
      <div key={memoryId} className="memory-item">
        <div className="memory-content">{memoryContent}</div>
        <button
          className="memory-delete-btn"
          onClick={() => handleDeleteClick(memory, memoryType)}
          disabled={isDeleting}
          title="Delete memory"
        >
          {isDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    );
  };

  return (
    <div className={`memory-viewer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {toast.visible && (
        <div className="toast-notification show">
          <span>{toast.message}</span>
          <button className="toast-close" onClick={dismissToast} title="Close">
            <X size={14} />
          </button>
        </div>
      )}
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
                  sessionMemories.map((memory, index) => renderMemoryItem(memory, index, 'session'))
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
                  globalMemories.map((memory, index) => renderMemoryItem(memory, index, 'global'))
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
