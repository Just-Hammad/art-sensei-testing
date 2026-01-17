import { supabase } from '../lib/supabaseClient';

export async function addMessageToSupabase(sessionId, messageData) {
    try {
        console.log('[Message Service] Adding message to session:', sessionId);

        const attachmentUrls = (messageData.attachments || [])
            .map(att => {
                if (typeof att === 'string') return att;
                return att.serverUrl || att.url;
            })
            .filter(url => url && typeof url === 'string' && !url.startsWith('data:'))
            .filter(url => url.trim().length > 0);

        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                chat_session_id: sessionId,
                role: messageData.role,
                content: messageData.content,
                attachments: attachmentUrls,
                example_image: messageData.exampleImage || null,
                metadata: messageData.metadata || {},
            })
            .select()
            .single();

        if (error) {
            console.error("[Message Service] Error inserting message:", error);
            return { success: false, error: error.message };
        }

        console.log("[Message Service] Message added successfully:", data.id);
        return { success: true, message: data };
    } catch (err) {
        console.error("[Message Service] Unexpected error:", err);
        return { success: false, error: err.message };
    }
}
