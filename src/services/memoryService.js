import { supabase } from '../lib/supabaseClient';
import { generateSessionUserId, generateGlobalUserId } from '../utils/memoryUtils';

const MEMORY_CACHE_DURATION = 5000;
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

    const { data: sessionMemories, error: sessionError } = await supabase
      .rpc('get_session_memories', {
        p_user_id: sessionUserId,
        p_chat_session_id: sessionId,
      });

    if (sessionError) {
      console.error('[Memory Fetch] Error fetching session memories:', sessionError);
      throw sessionError;
    }

    const extractedMemories = (sessionMemories || []).map(item => {
      if (item.metadata && item.metadata.data) {
        return item.metadata.data;
      }
      return item;
    });

    const result = {
      success: true,
      chat_session_id: sessionId,
      user_id: userId,
      count: extractedMemories.length,
      memories: extractedMemories
    };

    memoryCache.session = {
      data: result,
      timestamp: now
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching session memories:', error);
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

    const { data: globalMemories, error: globalError } = await supabase
      .rpc('get_global_memories', {
        p_user_id: globalUserId,
      });

    if (globalError) {
      console.error('[Memory Fetch] Error fetching global memories:', globalError);
      throw globalError;
    }

    const extractedMemories = (globalMemories || []).map(item => {
      if (item.metadata && item.metadata.data) {
        return item.metadata.data;
      }
      return item;
    });

    const result = {
      success: true,
      user_id: userId,
      count: extractedMemories.length,
      memories: extractedMemories
    };

    memoryCache.global = {
      data: result,
      timestamp: now
    };
    
    return result;
  } catch (error) {
    console.error('Error fetching global memories:', error);
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
