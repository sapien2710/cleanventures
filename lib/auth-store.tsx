/**
 * AuthStore — real backend auth via cleanventures-api (Supabase JWT).
 * Keeps the same AppUser interface so all screens work unchanged.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, saveTokens, clearTokens, getAccessToken } from "@/lib/api-client";

const SESSION_KEY = "@cleanventures:session_v2";

export type AppUser = {
  id: string;           // Supabase user UUID
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  city: string;
  about?: string;
  latitude?: number;
  longitude?: number;
  /** 'username' | 'displayName' */
  publicNamePref?: "username" | "displayName";
};

// ─── API response shapes ──────────────────────────────────────────────────────
type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    city: string | null;
    about: string | null;
    display_name_pref: string | null;
  };
};

function mapApiUser(u: AuthResponse["user"]): AppUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.full_name || u.username,
    avatar: u.avatar_url || "",
    city: u.city || "",
    about: u.about || undefined,
    publicNamePref: (u.display_name_pref as AppUser["publicNamePref"]) || "displayName",
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (
    emailOrUsername: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    username: string,
    fullName: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<AppUser, "id" | "username" | "email">>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  updateProfile: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        // Try to fetch current user from API
        const data = await api.get<AuthResponse["user"]>("/auth/me");
        const appUser = mapApiUser(data);
        setUser(appUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
      } catch {
        // Token expired or invalid — clear it
        await clearTokens();
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (
      emailOrUsername: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // The API accepts email; if user typed a username, append a domain
        const email = emailOrUsername.includes("@")
          ? emailOrUsername
          : `${emailOrUsername.toLowerCase().trim()}@cleanventures.app`;

        const data = await api.postNoAuth<AuthResponse>("/auth/login", {
          email,
          password,
        });
        await saveTokens(data.access_token, data.refresh_token);
        const appUser = mapApiUser(data.user);
        setUser(appUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Login failed.";
        return { success: false, error: msg };
      }
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      fullName: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const data = await api.postNoAuth<AuthResponse>("/auth/register", {
          email,
          password,
          username,
          full_name: fullName,
        });
        await saveTokens(data.access_token, data.refresh_token);
        const appUser = mapApiUser(data.user);
        setUser(appUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(appUser));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Registration failed.";
        return { success: false, error: msg };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await clearTokens();
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<AppUser, "id" | "username" | "email">>) => {
      if (!user) return;
      try {
        const payload: Record<string, unknown> = {};
        if (updates.displayName !== undefined) payload.full_name = updates.displayName;
        if (updates.avatar !== undefined) payload.avatar_url = updates.avatar;
        if (updates.city !== undefined) payload.city = updates.city;
        if (updates.about !== undefined) payload.about = updates.about;
        if (updates.publicNamePref !== undefined)
          payload.display_name_pref = updates.publicNamePref;

        const data = await api.patch<AuthResponse["user"]>("/auth/me", payload);
        const updated = mapApiUser(data);
        setUser(updated);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      } catch (err) {
        // Optimistic update locally even if API fails
        const updated: AppUser = { ...user, ...updates };
        setUser(updated);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
