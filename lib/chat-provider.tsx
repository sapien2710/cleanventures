/**
 * StreamChatProvider — connects the logged-in user to Stream Chat.
 * Uses the stream-chat JS client directly (no native modules required for Expo Go).
 * Provides helpers to create/join venture channels.
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { StreamChat, type Channel, type Event, type MessageResponse } from "stream-chat";
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
};

const StreamChatContext = createContext<StreamChatContextValue>({
  client: null,
  isReady: false,
  getChannel: () => null,
  loadChannel: async () => null,
  createVentureChannel: async () => null,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const connectedRef = useRef(false);
  const channelCache = useRef<Record<string, Channel>>({});

  useEffect(() => {
    const client = getStreamClient();

    if (!isAuthenticated || !user) {
      if (connectedRef.current) {
        client.disconnectUser().then(() => {
          connectedRef.current = false;
          setIsReady(false);
          channelCache.current = {};
        }).catch(() => {});
      }
      return;
    }

    if (connectedRef.current) return;

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

        connectedRef.current = true;
        setIsReady(true);
      } catch (err) {
        console.warn("[StreamChat] Failed to connect:", err);
      }
    }

    connectUser();
  }, [isAuthenticated, user?.id]);

  const getChannel = useCallback((ventureId: string): Channel | null => {
    return channelCache.current[ventureId] ?? null;
  }, []);

  const loadChannel = useCallback(async (ventureId: string, ventureName: string): Promise<Channel | null> => {
    if (!isReady) return null;
    const client = getStreamClient();
    const channelId = `venture-${ventureId}`;

    try {
      // Try to get existing channel first
      const channel = client.channel("messaging", channelId, { name: ventureName });
      await channel.watch();
      channelCache.current[ventureId] = channel;
      return channel;
    } catch (err) {
      console.warn("[StreamChat] Failed to load channel:", err);
      return null;
    }
  }, [isReady]);

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

  const client = isReady ? getStreamClient() : null;

  return (
    <StreamChatContext.Provider value={{ client, isReady, getChannel, loadChannel, createVentureChannel }}>
      {children}
    </StreamChatContext.Provider>
  );
}

export function useStreamChat() {
  return useContext(StreamChatContext);
}
