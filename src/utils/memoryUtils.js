export const MemoryLayer = {
  CHAT_SESSION: "session",
  GLOBAL_USER: "global"
};

export function generateMemoryUserId(userId, layer) {
  if (!userId) {
    throw new Error("userId cannot be empty");
  }
  
  return `${layer}_${userId}`;
}

export function generateSessionUserId(userId) {
  return generateMemoryUserId(userId, MemoryLayer.CHAT_SESSION);
}

export function generateGlobalUserId(userId) {
  return generateMemoryUserId(userId, MemoryLayer.GLOBAL_USER);
}
