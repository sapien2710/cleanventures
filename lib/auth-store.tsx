/**
 * AuthStore — in-memory user list with AsyncStorage session persistence.
 * Users: abhijeet/1234, priya/1234, rahul/1234 (expandable).
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "@cleanventures:session";
const PROFILE_KEY = "@cleanventures:profiles";

export type AppUser = {
  username: string;
  displayName: string;
  avatar: string;
  city: string;
  about?: string;
  latitude?: number;
  longitude?: number;
  /** 'username' | 'displayName' */
  publicNamePref?: 'username' | 'displayName';
};

// ─── In-memory user registry ──────────────────────────────────────────────────
const BASE_USERS: Array<AppUser & { password: string }> = [
  {
    username: "abhijeet",
    password: "1234",
    displayName: "Abhijeet Patil",
    avatar: "https://i.pravatar.cc/150?img=11",
    city: "Pune, Maharashtra",
    about: "Passionate about keeping Pune clean. Organising weekend cleanups since 2022.",
    publicNamePref: "displayName",
  },
  {
    username: "priya",
    password: "1234",
    displayName: "Priya Mehta",
    avatar: "https://i.pravatar.cc/150?img=5",
    city: "Mumbai, Maharashtra",
    about: "Marine drive cleanup volunteer. Let's make Mumbai spotless!",
    publicNamePref: "displayName",
  },
  {
    username: "rahul",
    password: "1234",
    displayName: "Rahul Desai",
    avatar: "https://i.pravatar.cc/150?img=33",
    city: "Nashik, Maharashtra",
    about: "Nashik cleanup crew lead. Every piece of trash picked up matters.",
    publicNamePref: "username",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<AppUser, 'username'>>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  updateProfile: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  // profile overrides keyed by username
  const [profileOverrides, setProfileOverrides] = useState<Record<string, Partial<AppUser>>>({});

  // Load saved profiles + session on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SESSION_KEY),
      AsyncStorage.getItem(PROFILE_KEY),
    ])
      .then(([rawSession, rawProfiles]) => {
        const overrides: Record<string, Partial<AppUser>> = rawProfiles ? JSON.parse(rawProfiles) : {};
        setProfileOverrides(overrides);
        if (rawSession) {
          const saved: AppUser = JSON.parse(rawSession);
          const found = BASE_USERS.find(u => u.username === saved.username);
          if (found) {
            const { password: _, ...base } = found;
            const merged: AppUser = { ...base, ...(overrides[found.username] || {}) };
            setUser(merged);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const found = BASE_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    );
    if (!found) {
      return { success: false, error: "Invalid username or password." };
    }
    const { password: _, ...base } = found;
    // Load latest overrides from storage
    const rawProfiles = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
    const overrides: Record<string, Partial<AppUser>> = rawProfiles ? JSON.parse(rawProfiles) : {};
    setProfileOverrides(overrides);
    const merged: AppUser = { ...base, ...(overrides[found.username] || {}) };
    setUser(merged);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(merged)).catch(() => {});
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Omit<AppUser, 'username'>>) => {
    if (!user) return;
    const rawProfiles = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
    const overrides: Record<string, Partial<AppUser>> = rawProfiles ? JSON.parse(rawProfiles) : {};
    overrides[user.username] = { ...(overrides[user.username] || {}), ...updates };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(overrides)).catch(() => {});
    setProfileOverrides(overrides);
    const updated: AppUser = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated)).catch(() => {});
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
