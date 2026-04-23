/**
 * StreamChatProvider — connects the logged-in user to Stream Chat.
 * Uses the stream-chat JS client directly (no native modules required for Expo Go).
 * Provides helpers to create/join venture channels.
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { StreamChat, type Channel } from "stream-chat";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api-client";

const STREAM_API_KEY = "7km7cbgntrc7";

// Singleton — must not be recreated on re-renders
let _client: StreamChat | null = null;
function getStreamClient(): StreamChat {
  if (!_client) {
    _client = StreamChat.getInstance(STREAM_API_KEY);
  }
  return _client;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StreamMessage = {
  id: string;
  text: string;
  user: { id: string; name?: string; image?: string };
  created_at: string;
  attachments?: Array<{ type: string; image_url?: string; thumb_url?: string }>;
};

type StreamChatContextValue = {
  client: StreamChat | null;
  isReady: boolean;
  getChannel: (ventureId: string) => Channel | null;
  loadChannel: (ventureId: string, ventureName: string) => Promise<Channel | null>;
  createVentureChannel: (ventureId: string, ventureName: string) => Promise<string | null>;
  addMemberToChannel: (ventureId: string) => Promise<boolean>;
};

const StreamChatContext = createContext<StreamChatContextValue>({
  client: null,
  isReady: false,
  getChannel: () => null,
  loadChannel: async () => null,
  createVentureChannel: async () => null,
  addMemberToChannel: async () => false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const connectedUserId = useRef<string | null>(null);
  const channelCache = useRef<Record<string, Channel>>({});

  useEffect(() => {
    const client = getStreamClient();

    // User logged out — disconnect
    if (!user) {
      if (connectedUserId.current) {
        client.disconnectUser().then(() => {
          connectedUserId.current = null;
          setIsReady(false);
          channelCache.current = {};
        }).catch(() => {});
      }
      return;
    }

    // Already connected as this user — skip
    if (connectedUserId.current === user.id) return;

    // If connected as a different user, disconnect first
    if (connectedUserId.current && connectedUserId.current !== user.id) {
      client.disconnectUser().catch(() => {});
      connectedUserId.current = null;
      setIsReady(false);
      channelCache.current = {};
    }

    async function connectUser() {
      try {
        const res = await api.get<{
          token: string;
          user_id: string;
          user_name: string;
        }>("/chat/token");

        await client.connectUser(
          { id: res.user_id, name: res.user_name },
          res.token
        );

        connectedUserId.current = user!.id;
        setIsReady(true);
        console.log("[StreamChat] Connected as", res.user_name);
      } catch (err) {
        console.warn("[StreamChat] Failed to connect:", err);
        // Retry after 3 seconds
        setTimeout(connectUser, 3000);
      }
    }

    connectUser();
  }, [user?.id]);

  const getChannel = useCallback((ventureId: string): Channel | null => {
    return channelCache.current[ventureId] ?? null;
  }, []);

  const loadChannel = useCallback(async (ventureId: string, ventureName: string): Promise<Channel | null> => {
    const client = getStreamClient();

    // Wait up to 8 seconds for Stream to be ready
    let waited = 0;
    while (!connectedUserId.current && waited < 8000) {
      await new Promise(r => setTimeout(r, 300));
      waited += 300;
    }

    if (!connectedUserId.current) {
      console.warn("[StreamChat] Not connected after waiting, cannot load channel");
      return null;
    }

    const channelId = `venture-${ventureId}`;

    // Check cache first
    if (channelCache.current[ventureId]) {
      return channelCache.current[ventureId];
    }

    try {
      const channel = client.channel("messaging", channelId, { name: ventureName });
      await channel.watch();
      channelCache.current[ventureId] = channel;
      return channel;
    } catch (err: any) {
      // Channel doesn't exist yet — create it via backend
      console.warn("[StreamChat] Channel not found, creating:", err?.message);
      try {
        await api.post("/chat/channel", {
          venture_id: ventureId,
          venture_name: ventureName,
        });
        // Now try to watch again
        const channel = client.channel("messaging", channelId, { name: ventureName });
        await channel.watch();
        channelCache.current[ventureId] = channel;
        return channel;
      } catch (err2) {
        console.warn("[StreamChat] Failed to create/load channel:", err2);
        return null;
      }
    }
  }, []);

  const createVentureChannel = useCallback(async (ventureId: string, ventureName: string): Promise<string | null> => {
    try {
      const res = await api.post<{ channel_id: string }>("/chat/channel", {
        venture_id: ventureId,
        venture_name: ventureName,
      });
      return res.channel_id;
    } catch (err) {
      console.warn("[StreamChat] Failed to create channel:", err);
      return null;
    }
  }, []);

  /**
   * Add the currently logged-in user to a venture's Stream channel.
   * Called when a join request is approved so the new member can access chat.
   */
  const addMemberToChannel = useCallback(async (ventureId: string): Promise<boolean> => {
    try {
      const channelId = `venture-${ventureId}`;
      await api.post(`/chat/channel/${channelId}/members`, {});
      // Invalidate cache so channel is re-fetched with updated membership
      delete channelCache.current[ventureId];
      return true;
    } catch (err) {
      console.warn("[StreamChat] Failed to add member to channel:", err);
      return false;
    }
  }, []);

  const client = isReady ? getStreamClient() : null;

  return (
    <StreamChatContext.Provider value={{ client, isReady, getChannel, loadChannel, createVentureChannel, addMemberToChannel }}>
      {children}
    </StreamChatContext.Provider>
  );
}

export function useStreamChat() {
  return useContext(StreamChatContext);
}
