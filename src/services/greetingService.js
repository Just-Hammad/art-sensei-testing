import { API_CONFIG } from '../utils/route';

export async function fetchFirstMessage(userId, globalMemories = null) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/greeting/first-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        user_name: "Testing",
        global_memories: globalMemories,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch first message: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.first_message) {
      return data.first_message;
    }
    
    return null;
  } catch (error) {
    console.error("[GreetingService] Error fetching first message:", error);
    return null;
  }
}
