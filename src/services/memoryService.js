import { API_CONFIG } from '../utils/route';

const MEMORY_CACHE_DURATION = 8000;
const memoryCache = {
  session: { data: null, timestamp: 0 },
  global: { data: null, timestamp: 0 }
};

export const fetchSessionMemories = async (sessionId, userId) => {
  const now = Date.now();

  if (memoryCache.session.data && (now - memoryCache.session.timestamp) < MEMORY_CACHE_DURATION) {
    return memoryCache.session.data;
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMORIES.SESSION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_session_id: sessionId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('[Memory Fetch] Session memories response:', data);

    const result = {
      success: data.success || true,
      chat_session_id: sessionId,
      user_id: userId,
      count: data.count || 0,
      memories: data.memories || []
    };

    memoryCache.session = {
      data: result,
      timestamp: now
    };

    return result;
  } catch (error) {
    console.error('[Memory Fetch] Error fetching session memories:', error);
    return {
      success: false,
      chat_session_id: sessionId,
      user_id: userId,
      count: 0,
      memories: []
    };
  }
};

export const fetchGlobalMemories = async (userId) => {
  const now = Date.now();

  if (memoryCache.global.data && (now - memoryCache.global.timestamp) < MEMORY_CACHE_DURATION) {
    return memoryCache.global.data;
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMORIES.GLOBAL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('[Memory Fetch] Global memories response:', data);

    const result = {
      success: data.success || true,
      user_id: userId,
      count: data.count || 0,
      memories: data.memories || []
    };

    memoryCache.global = {
      data: result,
      timestamp: now
    };

    return result;
  } catch (error) {
    console.error('[Memory Fetch] Error fetching global memories:', error);
    return {
      success: false,
      user_id: userId,
      count: 0,
      memories: []
    };
  }
};

export const clearMemoryCache = () => {
  memoryCache.session = { data: null, timestamp: 0 };
  memoryCache.global = { data: null, timestamp: 0 };
};

export const deleteSessionMemories = async (sessionId, userId) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMORIES.SESSION}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_session_id: sessionId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    clearMemoryCache();

    return result;
  } catch (error) {
    console.error('Error deleting session memories:', error);
    throw error;
  }
};

export const deleteMemoryById = async (memoryId) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MEMORIES.MEMORY}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        memory_id: memoryId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('[Memory Delete] Delete response:', result);

    clearMemoryCache();

    return result;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
};

