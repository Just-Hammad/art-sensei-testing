export const formatSessionContext = (sessionMemories) => {
  const memories = Array.isArray(sessionMemories) ? sessionMemories : (sessionMemories?.memories || []);

  if (!memories || memories.length === 0) {
    return "No prior session history.";
  }

  const formattedMemories = memories
    .map((item) => {
      const memoryContent = typeof item === 'string' ? item : (item.memory || item.content || (item.metadata?.data) || JSON.stringify(item));
      return `- ${memoryContent}`;
    })
    .join("\n");

  console.log("[FORMATTER] session=>", formattedMemories)

  return `\n${formattedMemories}`;
};

export const formatGlobalContext = (globalMemories) => {
  const memories = Array.isArray(globalMemories) ? globalMemories : (globalMemories?.memories || []);

  if (!memories || memories.length === 0) {
    return "No long-term user knowledge available.";
  }

  const formattedMemories = memories
    .map((item) => {
      const memoryContent = typeof item === 'string' ? item : (item.memory || item.content || (item.metadata?.data) || JSON.stringify(item));
      return `- ${memoryContent}`;
    })
    .join("\n");

  console.log("[FORMATTER] global=>", formattedMemories)

  return `\n${formattedMemories}`;
};
