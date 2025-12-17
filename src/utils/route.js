export const API_CONFIG = {
    BASE_URL: "https://mvp-backend-production-4c8b.up.railway.app",
    ELEVENLABS_BASE_URL: "https://api.elevenlabs.io/v1",
    ENDPOINTS: {
        MEMORIES: {
            SESSION: "/api/v1/memories/session",
            GLOBAL: "/api/v1/memories/global",
            MEMORY: "/api/v1/memories/memory"
        },
        IMAGES: {
            UPLOAD: "/api/v1/images/upload"
        },
        VISION: {
            POINT: "/api/v1/vision/point"
        },
        ELEVENLABS: {
            SIGNED_URL: "/api/v1/elevenlabs/get-signed-url",
            AGENTS: "/convai/agents",
            KNOWLEDGE_BASE: "/convai/knowledge-base"
        }
    }
};
