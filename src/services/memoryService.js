import { supabase } from '../lib/supabaseClient';
import { generateSessionUserId, generateGlobalUserId } from '../utils/memoryUtils';

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
    const sessionUserId = generateSessionUserId(userId);
    
    console.log('[SUPABASE SESSION] Fetching memories for:', { sessionId, userId, sessionUserId });
    
    const { data, error } = await supabase.rpc('get_session_memories', {
      p_user_id: sessionUserId,
      p_chat_session_id: sessionId
    });

    if (error) {
      console.error('[SUPABASE SESSION] Error:', error);
      throw new Error(`Failed to fetch session memories: ${error.message}`);
    }

    console.log('[SUPABASE SESSION] Raw data:', data);

    const memories = data ? data.map(item => {
      const metadata = item.metadata || {};
      const memoryContent = metadata.data || metadata.memory || metadata.content || JSON.stringify(metadata);
      return {
        id: item.id,
        memory: memoryContent,
        metadata: metadata
      };
    }) : [];

    console.log('[SUPABASE SESSION] Processed memories:', memories.length);
    memories.forEach((mem, idx) => {
      console.log(`[SUPABASE SESSION] [${idx + 1}]`, mem.memory.substring(0, 100));
    });

    const result = {
      success: true,
      chat_session_id: sessionId,
      user_id: userId,
      count: memories.length,
      memories: memories
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
    const globalUserId = generateGlobalUserId(userId);
    
    console.log('[SUPABASE GLOBAL] Fetching memories for:', { userId, globalUserId });
    
    const { data, error } = await supabase.rpc('get_global_memories', {
      p_user_id: globalUserId
    });

    if (error) {
      console.error('[SUPABASE GLOBAL] Error:', error);
      throw new Error(`Failed to fetch global memories: ${error.message}`);
    }

    console.log('[SUPABASE GLOBAL] Raw data:', data);

    const memories = data ? data.map(item => {
      const metadata = item.metadata || {};
      const memoryContent = metadata.data || metadata.memory || metadata.content || JSON.stringify(metadata);
      return {
        id: item.id,
        memory: memoryContent,
        metadata: metadata
      };
    }) : [];

    console.log('[SUPABASE GLOBAL] Processed memories:', memories.length);
    memories.forEach((mem, idx) => {
      console.log(`[SUPABASE GLOBAL] [${idx + 1}]`, mem.memory.substring(0, 100));
    });

    const result = {
      success: true,
      user_id: userId,
      count: memories.length,
      memories: memories
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
    console.log('[DELETE] Session memories delete functionality not implemented with Supabase RPC');
    clearMemoryCache();
    return { success: true, message: 'Cache cleared' };
  } catch (error) {
    console.error('Error deleting session memories:', error);
    throw error;
  }
};

export const deleteMemoryById = async (memoryId) => {
  try {
    console.log('[DELETE] Memory by ID delete functionality not implemented with Supabase RPC');
    clearMemoryCache();
    return { success: true, message: 'Cache cleared' };
  } catch (error) {
    console.error('Error deleting memory by ID:', error);
    throw error;
  }
};

