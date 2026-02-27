/**
 * AuthStore — in-memory user list with AsyncStorage session persistence.
 * Users: abhi/1234, priya/5678 (expandable).
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "@cleanventures:session";

export type AppUser = {
  username: string;
  displayName: string;
  avatar: string;
  city: string;
};

// ─── In-memory user registry ──────────────────────────────────────────────────
const USERS: Array<AppUser & { password: string }> = [
  {
    username: "abhijeet",
    password: "1234",
    displayName: "Abhijeet Patil",
    avatar: "https://i.pravatar.cc/150?img=11",
    city: "Pune, Maharashtra",
  },
  {
    username: "priya",
    password: "1234",
    displayName: "Priya Mehta",
    avatar: "https://i.pravatar.cc/150?img=5",
    city: "Mumbai, Maharashtra",
  },
  {
    username: "rahul",
    password: "1234",
    displayName: "Rahul Desai",
    avatar: "https://i.pravatar.cc/150?img=33",
    city: "Nashik, Maharashtra",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then(raw => {
        if (raw) {
          const saved: AppUser = JSON.parse(raw);
          // Validate the saved username still exists
          const found = USERS.find(u => u.username === saved.username);
          if (found) {
            const { password: _, ...appUser } = found;
            setUser(appUser);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const found = USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    );
    if (!found) {
      return { success: false, error: "Invalid username or password." };
    }
    const { password: _, ...appUser } = found;
    setUser(appUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(appUser)).catch(() => {});
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
