/**
 * ActivityStore — persisted, real-time activity events per venture.
 *
 * Events are emitted explicitly by actions (task complete, fund contributed,
 * status changed, member joined, etc.) and stored in AsyncStorage so the
 * activity feed survives app restarts.
 *
 * The feed in the Mission tab merges:
 *   1. Static seed events (venture creation, initial members, seed transactions)
 *   2. Live events from this store (real-time actions taken in the app)
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVITY_KEY = "@cleanventures:activity_events";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'venture_created'
  | 'venture_activated'
  | 'venture_completed'
  | 'member_joined'
  | 'member_role_changed'
  | 'task_created'
  | 'task_completed'
  | 'funds_contributed'
  | 'photo_uploaded';

export type ActivityEvent = {
  id: string;
  ventureId: string;
  type: ActivityEventType;
  icon: string;
  iconColor: string;
  text: string;
  timestamp: string; // ISO string
};

type ActivityMap = Record<string, ActivityEvent[]>; // ventureId → ActivityEvent[]

type State = {
  events: ActivityMap;
  loaded: boolean;
};

type Action =
  | { type: 'LOAD'; events: ActivityMap }
  | { type: 'ADD_EVENT'; ventureId: string; event: ActivityEvent };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { events: action.events, loaded: true };
    case 'ADD_EVENT': {
      const existing = state.events[action.ventureId] ?? [];
      // Avoid duplicate IDs
      if (existing.some(e => e.id === action.event.id)) return state;
      return {
        ...state,
        events: {
          ...state.events,
          [action.ventureId]: [action.event, ...existing].slice(0, 50), // keep last 50 per venture
        },
      };
    }
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = {
  loaded: boolean;
  getEvents: (ventureId: string) => ActivityEvent[];
  addEvent: (ventureId: string, event: Omit<ActivityEvent, 'id' | 'ventureId' | 'timestamp'>) => void;
  /** Convenience: emit a typed event with auto icon/color */
  emit: (ventureId: string, type: ActivityEventType, text: string) => void;
};

const ActivityContext = createContext<ContextValue>({
  loaded: false,
  getEvents: () => [],
  addEvent: () => {},
  emit: () => {},
});

// ─── Icon / color mapping ─────────────────────────────────────────────────────

function iconForType(type: ActivityEventType): { icon: string; iconColor: string } {
  switch (type) {
    case 'venture_created':   return { icon: '🌱', iconColor: '#2d5016' };
    case 'venture_activated': return { icon: '▶️', iconColor: '#F59E0B' };
    case 'venture_completed': return { icon: '✅', iconColor: '#22C55E' };
    case 'member_joined':     return { icon: '👤', iconColor: '#6366F1' };
    case 'member_role_changed': return { icon: '🔑', iconColor: '#8B5CF6' };
    case 'task_created':      return { icon: '📋', iconColor: '#0EA5E9' };
    case 'task_completed':    return { icon: '✔️', iconColor: '#22C55E' };
    case 'funds_contributed': return { icon: '💰', iconColor: '#F59E0B' };
    case 'photo_uploaded':    return { icon: '📷', iconColor: '#EC4899' };
    default:                  return { icon: '📌', iconColor: '#6B7280' };
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { events: {}, loaded: false });

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
        const events: ActivityMap = raw ? JSON.parse(raw) : {};
        dispatch({ type: 'LOAD', events });
      } catch {
        dispatch({ type: 'LOAD', events: {} });
      }
    })();
  }, []);

  // Persist whenever events change (after initial load)
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(state.events)).catch(() => {});
  }, [state.events, state.loaded]);

  const getEvents = useCallback((ventureId: string): ActivityEvent[] => {
    return state.events[ventureId] ?? [];
  }, [state.events]);

  const addEvent = useCallback((ventureId: string, event: Omit<ActivityEvent, 'id' | 'ventureId' | 'timestamp'>) => {
    dispatch({
      type: 'ADD_EVENT',
      ventureId,
      event: {
        ...event,
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ventureId,
        timestamp: new Date().toISOString(),
      },
    });
  }, []);

  const emit = useCallback((ventureId: string, type: ActivityEventType, text: string) => {
    const { icon, iconColor } = iconForType(type);
    addEvent(ventureId, { type, icon, iconColor, text });
  }, [addEvent]);

  return (
    <ActivityContext.Provider value={{ loaded: state.loaded, getEvents, addEvent, emit }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  return useContext(ActivityContext);
}
