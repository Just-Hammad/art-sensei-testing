import { supabase } from '../lib/supabaseClient';

function formatMessageContent(content, exampleImage) {
    const hasExampleImage = exampleImage && exampleImage.trim().length > 0;

    if (!hasExampleImage) {
        return content;
    }

    const contentBlocks = [];

    let textContent = content || "";
    if (hasExampleImage) {
        textContent = textContent.trim();
        textContent += textContent.length > 0
            ? `\n[Showed example artwork: ${exampleImage}]`
            : `[Showed example artwork: ${exampleImage}]`;
    }

    if (textContent.trim().length > 0) {
        contentBlocks.push({ type: "text", text: textContent });
    }

    return contentBlocks.length > 0 ? contentBlocks : content;
}

function formatTimestamp(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatToAnthropicMessages(messages) {
    if (!messages || messages.length === 0) {
        return [];
    }

    return messages
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .map((msg) => {
            const baseContent = formatMessageContent(msg.content, msg.example_image);
            const timestamp = formatTimestamp(msg.created_at);

            let contentWithTimestamp;

            if (typeof baseContent === 'string') {
                contentWithTimestamp = `[${timestamp}] ${baseContent}`;
            } else if (Array.isArray(baseContent)) {
                const textBlock = baseContent.find(block => block.type === 'text');
                if (textBlock) {
                    textBlock.text = `[${timestamp}] ${textBlock.text}`;
                }
                contentWithTimestamp = baseContent;
            } else {
                contentWithTimestamp = baseContent;
            }

            return {
                role: msg.role,
                content: contentWithTimestamp,
            };
        });
}

export async function getRawChatMessages(sessionId) {
    try {
        console.log('[Chat Service] Fetching raw messages for session:', sessionId);

        const { data: messages, error } = await supabase
            .from("chat_messages")
            .select("role, content, example_image, attachments, created_at")
            .eq("chat_session_id", sessionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[Chat Service] Error fetching raw messages:", error);
            return { data: [], error: error.message };
        }

        const formattedMessages = (messages || [])
            .filter((msg) => msg.role === "user" || msg.role === "assistant")
            .map((msg) => ({
                role: msg.role,
                content: msg.content || "",
                exampleImage: msg.example_image || null,
                attachments: (msg.attachments || []).map(url => ({
                    serverUrl: url,
                    localUrl: url
                })),
                timestamp: new Date(msg.created_at)
            }));

        console.log('[Chat Service] Raw messages count:', formattedMessages.length);
        return { data: formattedMessages, error: null };
    } catch (err) {
        console.error("[Chat Service] Unexpected error:", err);
        return { data: [], error: err.message };
    }
}

export async function getChatMessagesBySessionId(sessionId) {
    try {
        console.log('[Chat Service] Fetching messages for session:', sessionId);

        const { data: messages, error } = await supabase
            .from("chat_messages")
            .select("role, content, example_image, created_at")
            .eq("chat_session_id", sessionId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[Chat Service] Error:", error);
            return { data: [], error: error.message };
        }

        console.log('[Chat Service] Raw messages from DB:', messages?.length || 0);

        const anthropicMessages = formatToAnthropicMessages(messages);

        console.log('[Chat Service] Formatted messages count:', anthropicMessages.length);

        return { data: anthropicMessages, error: null };
    } catch (err) {
        console.error("[Chat Service] Unexpected error:", err);
        return { data: [], error: err.message };
    }
}
