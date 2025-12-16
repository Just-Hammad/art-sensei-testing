import { supabase } from '../lib/supabaseClient';

const SESSION_STORAGE_KEY = 'artsensei_session_id';

export const createNewSession = async (userId) => {
  try {
    const metadata = {
      created_via: 'web',
      timestamp: new Date().toISOString(),
      last_mode: 'text',
      last_opened: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: `Session - ${new Date().toLocaleDateString()}`,
        metadata,
        is_initiated: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Create Session] Error:', error);
      throw new Error(error.message);
    }

    console.log('[Create Session] Success:', data.id);
    return {
      success: true,
      sessionId: data.id,
      session: data,
    };
  } catch (err) {
    console.error('[Create Session] Unexpected error:', err);
    throw err;
  }
};

export const saveSessionToStorage = (sessionId) => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    console.log('[Session Manager] Session saved to local storage:', sessionId);
  } catch (err) {
    console.error('[Session Manager] Failed to save session to storage:', err);
  }
};

export const getSessionFromStorage = () => {
  try {
    const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    console.log('[Session Manager] Session loaded from storage:', sessionId);
    return sessionId;
  } catch (err) {
    console.error('[Session Manager] Failed to load session from storage:', err);
    return null;
  }
};

export const clearSessionFromStorage = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('[Session Manager] Session cleared from storage');
  } catch (err) {
    console.error('[Session Manager] Failed to clear session from storage:', err);
  }
};

export const initializeSession = async (userId) => {
  const existingSessionId = getSessionFromStorage();
  
  if (existingSessionId) {
    console.log('[Session Manager] Using existing session:', existingSessionId);
    return existingSessionId;
  }

  console.log('[Session Manager] No existing session found, creating new one...');
  const result = await createNewSession(userId);
  saveSessionToStorage(result.sessionId);
  return result.sessionId;
};
