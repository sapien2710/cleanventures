/**
 * NotificationsStore — in-memory notification list with AsyncStorage persistence.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFS_KEY = "@cleanventures:notifications";

export type NotifType = "join_accepted" | "join_declined" | "task_assigned" | "venture_activated" | "venture_completed" | "contribution" | "general";

export type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  ventureId?: string;
};

// Seed notifications so there's something to see on first launch
const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "join_accepted",
    title: "Request Accepted!",
    body: "Ravi Kumar accepted your request to join LBS Road Cleanup as a Volunteer.",
    timestamp: Date.now() - 1000 * 60 * 30,
    read: false,
    ventureId: "v1",
  },
  {
    id: "n2",
    type: "venture_activated",
    title: "Venture Activated",
    body: "Juhu Beach Mega Clean-Up has moved from Proposed to Active. Get ready!",
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    read: false,
    ventureId: "v2",
  },
  {
    id: "n3",
    type: "task_assigned",
    title: "New Task: Waste Segregation",
    body: "You've been assigned the 'Waste Segregation' task in Sabarmati Riverfront Drive.",
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    read: true,
    ventureId: "v3",
  },
  {
    id: "n4",
    type: "contribution",
    title: "Contribution Received",
    body: "Priya Mehta contributed ₹500 to your venture Vadodara Old City Heritage Walk.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
    ventureId: "v1",
  },
];

type ContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<ContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);

  // Load from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(NOTIFS_KEY)
      .then(raw => {
        if (raw) {
          const saved: Notification[] = JSON.parse(raw);
          // Merge: saved takes precedence over seed (by id)
          const savedIds = new Set(saved.map(n => n.id));
          setNotifications([...saved, ...SEED_NOTIFICATIONS.filter(n => !savedIds.has(n.id))]);
        }
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((list: Notification[]) => {
    AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(list)).catch(() => {});
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      persist(updated);
      return updated;
    });
  }, [persist]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  }, [persist]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
