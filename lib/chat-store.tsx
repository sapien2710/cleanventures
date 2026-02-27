/**
 * ChatStore — manages venture group chat messages.
 * Messages are stored per chatId (ventureId-based) and persisted to AsyncStorage.
 * Supports text, image, and poll message types.
 * All 3 demo users share the same message history (simulating a shared server).
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_KEY = "@cleanventures:chats_v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PollOption = {
  id: string;
  text: string;
  votes: string[]; // authUsernames who voted
};

export type ChatMessage = {
  id: string;
  chatId: string;
  authUsername: string;       // sender's auth username
  senderName: string;         // display name
  senderAvatar: string;
  timestamp: string;          // ISO string
  type: 'text' | 'image' | 'poll';
  // text message
  text?: string;
  // image message
  imageUri?: string;
  imageCaption?: string;
  // poll message
  pollQuestion?: string;
  pollOptions?: PollOption[];
  pollEndsAt?: string;        // ISO string, optional
};

export type ChatMeta = {
  chatId: string;
  ventureId: string;
  ventureName: string;
  avatar: string;
  participants: number;
};

// ─── State ────────────────────────────────────────────────────────────────────

type State = {
  messages: Record<string, ChatMessage[]>; // chatId → messages
  loaded: boolean;
};

type Action =
  | { type: "LOAD"; messages: Record<string, ChatMessage[]> }
  | { type: "SEND_MESSAGE"; chatId: string; message: ChatMessage }
  | { type: "VOTE_POLL"; chatId: string; messageId: string; optionId: string; authUsername: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { messages: action.messages, loaded: true };

    case "SEND_MESSAGE": {
      const existing = state.messages[action.chatId] ?? [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.chatId]: [...existing, action.message],
        },
      };
    }

    case "VOTE_POLL": {
      const msgs = state.messages[action.chatId] ?? [];
      const updated = msgs.map(m => {
        if (m.id !== action.messageId || m.type !== 'poll' || !m.pollOptions) return m;
        const newOptions = m.pollOptions.map(opt => {
          if (opt.id === action.optionId) {
            // Toggle vote
            const alreadyVoted = opt.votes.includes(action.authUsername);
            return {
              ...opt,
              votes: alreadyVoted
                ? opt.votes.filter(v => v !== action.authUsername)
                : [...opt.votes, action.authUsername],
            };
          }
          // Remove vote from other options (single-choice)
          return { ...opt, votes: opt.votes.filter(v => v !== action.authUsername) };
        });
        return { ...m, pollOptions: newOptions };
      });
      return {
        ...state,
        messages: { ...state.messages, [action.chatId]: updated },
      };
    }

    default:
      return state;
  }
}

// ─── Seed messages ────────────────────────────────────────────────────────────

const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: 'seed-c1-1', chatId: 'c1', authUsername: 'priya',
      senderName: 'Priya Mehta', senderAvatar: 'https://i.pravatar.cc/150?img=5',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Hey team! Reminder that we start at 7 AM sharp tomorrow.',
    },
    {
      id: 'seed-c1-2', chatId: 'c1', authUsername: 'rahul',
      senderName: 'Rahul Desai', senderAvatar: 'https://i.pravatar.cc/150?img=33',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Got it! Should we bring our own gloves or will they be provided?',
    },
    {
      id: 'seed-c1-3', chatId: 'c1', authUsername: 'abhijeet',
      senderName: 'Abhijeet Patil', senderAvatar: 'https://i.pravatar.cc/150?img=12',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Gloves and masks are being procured from the marketplace. Should arrive by tonight.',
    },
    {
      id: 'seed-c1-4', chatId: 'c1', authUsername: 'priya',
      senderName: 'Priya Mehta', senderAvatar: 'https://i.pravatar.cc/150?img=5',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      type: 'poll',
      pollQuestion: 'What time works best for the debrief after cleanup?',
      pollOptions: [
        { id: 'p1', text: '11:00 AM', votes: ['rahul'] },
        { id: 'p2', text: '12:00 PM', votes: ['abhijeet'] },
        { id: 'p3', text: '1:00 PM', votes: [] },
      ],
    },
    {
      id: 'seed-c1-5', chatId: 'c1', authUsername: 'priya',
      senderName: 'Priya Mehta', senderAvatar: 'https://i.pravatar.cc/150?img=5',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: 'text', text: "Don't forget to bring extra bags tomorrow!",
    },
  ],
  c2: [
    {
      id: 'seed-c2-1', chatId: 'c2', authUsername: 'rahul',
      senderName: 'Rahul Desai', senderAvatar: 'https://i.pravatar.cc/150?img=33',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'The paint has arrived at the depot.',
    },
    {
      id: 'seed-c2-2', chatId: 'c2', authUsername: 'abhijeet',
      senderName: 'Abhijeet Patil', senderAvatar: 'https://i.pravatar.cc/150?img=12',
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Excellent! Let\'s plan the painting schedule for the weekend.',
    },
  ],
  c3: [
    {
      id: 'seed-c3-1', chatId: 'c3', authUsername: 'priya',
      senderName: 'Priya Mehta', senderAvatar: 'https://i.pravatar.cc/150?img=5',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Great work everyone! Final report coming soon.',
    },
  ],
  c4: [
    {
      id: 'seed-c4-1', chatId: 'c4', authUsername: 'abhijeet',
      senderName: 'Abhijeet Patil', senderAvatar: 'https://i.pravatar.cc/150?img=12',
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'See you all Saturday at 6:30 AM!',
    },
    {
      id: 'seed-c4-2', chatId: 'c4', authUsername: 'rahul',
      senderName: 'Rahul Desai', senderAvatar: 'https://i.pravatar.cc/150?img=33',
      timestamp: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString(),
      type: 'text', text: 'Will be there! Bringing 5 volunteers from my office.',
    },
  ],
};

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = {
  getMessages: (chatId: string) => ChatMessage[];
  sendMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  votePoll: (chatId: string, messageId: string, optionId: string, authUsername: string) => void;
  getLastMessage: (chatId: string) => ChatMessage | null;
  getUnreadCount: (chatId: string, authUsername: string, lastReadTimestamp?: string) => number;
  /** Returns total count of messages from others across all chatIds that arrived after lastReadTimestamp */
  getTotalUnread: (chatIds: string[], authUsername: string, lastReadTimestamps: Record<string, string>) => number;
  /** Mark a chat as read (update last-read timestamp) */
  markChatRead: (chatId: string, authUsername: string) => void;
  /** Get the last-read timestamp for a chat+user */
  getLastRead: (chatId: string, authUsername: string) => string | undefined;
  loaded: boolean;
};

const ChatContext = createContext<ContextValue>({
  getMessages: () => [],
  sendMessage: () => {},
  votePoll: () => {},
  getLastMessage: () => null,
  getUnreadCount: () => 0,
  getTotalUnread: () => 0,
  markChatRead: () => {},
  getLastRead: () => undefined,
  loaded: false,
});

const LAST_READ_KEY = '@cleanventures:chat_last_read';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { messages: {}, loaded: false });
  // lastRead: Record<`${chatId}:${authUsername}`, ISO timestamp>
  const [lastRead, setLastRead] = React.useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAT_KEY);
        if (raw) {
          const saved: Record<string, ChatMessage[]> = JSON.parse(raw);
          // Merge seed messages for chats that have no saved messages
          const merged: Record<string, ChatMessage[]> = { ...SEED_MESSAGES };
          Object.keys(saved).forEach(chatId => {
            if (saved[chatId].length > 0) {
              merged[chatId] = saved[chatId];
            }
          });
          dispatch({ type: "LOAD", messages: merged });
        } else {
          dispatch({ type: "LOAD", messages: SEED_MESSAGES });
        }
      } catch {
        dispatch({ type: "LOAD", messages: SEED_MESSAGES });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(state.messages)).catch(() => {});
  }, [state.messages, state.loaded]);

  const getMessages = useCallback((chatId: string): ChatMessage[] => {
    return state.messages[chatId] ?? [];
  }, [state.messages]);

  const sendMessage = useCallback((chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const full: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "SEND_MESSAGE", chatId, message: full });
  }, []);

  const votePoll = useCallback((chatId: string, messageId: string, optionId: string, authUsername: string) => {
    dispatch({ type: "VOTE_POLL", chatId, messageId, optionId, authUsername });
  }, []);

  const getLastMessage = useCallback((chatId: string): ChatMessage | null => {
    const msgs = state.messages[chatId];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  }, [state.messages]);

  // Load last-read timestamps from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(LAST_READ_KEY).then(raw => {
      if (raw) setLastRead(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const getUnreadCount = useCallback((chatId: string, authUsername: string, lastReadTimestamp?: string): number => {
    if (!lastReadTimestamp) return 0;
    const msgs = state.messages[chatId] ?? [];
    return msgs.filter(m => m.authUsername !== authUsername && m.timestamp > lastReadTimestamp).length;
  }, [state.messages]);

  const getTotalUnread = useCallback((chatIds: string[], authUsername: string, lastReadTimestamps: Record<string, string>): number => {
    return chatIds.reduce((total, chatId) => {
      const lrt = lastReadTimestamps[`${chatId}:${authUsername}`];
      if (!lrt) {
        // If never read, count all messages from others
        const msgs = state.messages[chatId] ?? [];
        return total + msgs.filter(m => m.authUsername !== authUsername).length;
      }
      const msgs = state.messages[chatId] ?? [];
      return total + msgs.filter(m => m.authUsername !== authUsername && m.timestamp > lrt).length;
    }, 0);
  }, [state.messages]);

  const markChatRead = useCallback((chatId: string, authUsername: string) => {
    const key = `${chatId}:${authUsername}`;
    const now = new Date().toISOString();
    setLastRead(prev => {
      const updated = { ...prev, [key]: now };
      AsyncStorage.setItem(LAST_READ_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const getLastRead = useCallback((chatId: string, authUsername: string): string | undefined => {
    return lastRead[`${chatId}:${authUsername}`];
  }, [lastRead]);

  return (
    <ChatContext.Provider value={{ getMessages, sendMessage, votePoll, getLastMessage, getUnreadCount, getTotalUnread, markChatRead, getLastRead, loaded: state.loaded }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
