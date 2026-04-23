/**
 * VenturesStore — real backend via cleanventures-api.
 * Keeps the exact same context interface so all screens work unchanged.
 * Local-only features (join requests, pledges, venture txs) remain in AsyncStorage.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-store";
import {
  type Venture,
  type Task,
  type JoinRequest,
  type VentureStatus,
  type UserRole,
  type UserPrivilege,
  type Transaction,
} from "@/lib/mock-data";

// ─── Local-only persistence keys ─────────────────────────────────────────────
const JOIN_REQUESTS_KEY = "@cleanventures:join_requests_v2";
const VENTURE_TXS_KEY = "@cleanventures:venture_txs";
const PLEDGES_KEY = "@cleanventures:pledges";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VentureMember = {
  id: string;
  username: string;
  authUsername?: string;
  avatar: string;
  role: UserRole;
  privilege: UserPrivilege | null;
  isOwner?: boolean;
};

type TasksMap = Record<string, Task[]>;
type JoinRequestsMap = Record<string, JoinRequest[]>;
type MembersMap = Record<string, VentureMember[]>;
type VentureTxsMap = Record<string, Transaction[]>;

export type Pledge = {
  authUsername: string;
  displayName: string;
  amount: number;
  ventureId: string;
};
type PledgesMap = Record<string, Pledge[]>;

type State = {
  ventures: Venture[];
  tasks: TasksMap;
  joinRequests: JoinRequestsMap;
  members: MembersMap;
  ventureTxs: VentureTxsMap;
  pledges: PledgesMap;
  loaded: boolean;
};

type Action =
  | { type: "SET_VENTURES"; ventures: Venture[]; members: MembersMap }
  | { type: "SET_TASKS"; ventureId: string; tasks: Task[] }
  | { type: "ADD_VENTURE"; venture: Venture; ownerMember?: VentureMember }
  | { type: "UPDATE_VENTURE"; id: string; patch: Partial<Venture> }
  | { type: "ADD_TASK"; ventureId: string; task: Task }
  | { type: "UPDATE_TASK"; ventureId: string; taskId: string; patch: Partial<Task> }
  | { type: "ADD_JOIN_REQUEST"; ventureId: string; request: JoinRequest }
  | { type: "UPDATE_JOIN_REQUEST_STATUS"; ventureId: string; requestId: string; status: "approved" | "denied" }
  | { type: "REJECT_ALL_PENDING_REQUESTS"; ventureId: string }
  | { type: "ADD_MEMBER"; ventureId: string; member: VentureMember }
  | { type: "REMOVE_MEMBER"; ventureId: string; memberId: string }
  | { type: "UPDATE_MEMBER"; ventureId: string; memberId: string; patch: Partial<VentureMember> }
  | { type: "ADD_VENTURE_TX"; ventureId: string; tx: Transaction }
  | { type: "RECORD_PLEDGE"; pledge: Pledge }
  | { type: "REMOVE_PLEDGE"; ventureId: string; authUsername: string }
  | { type: "LOAD_LOCAL"; joinRequests: JoinRequestsMap; ventureTxs: VentureTxsMap; pledges: PledgesMap; loaded: true };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_VENTURES":
      return { ...state, ventures: action.ventures, members: { ...state.members, ...action.members }, loaded: true };

    case "SET_TASKS":
      return { ...state, tasks: { ...state.tasks, [action.ventureId]: action.tasks } };

    case "ADD_VENTURE": {
      const newMembers = action.ownerMember
        ? { ...state.members, [action.venture.id]: [action.ownerMember] }
        : state.members;
      return { ...state, ventures: [action.venture, ...state.ventures], members: newMembers };
    }

    case "UPDATE_VENTURE":
      return { ...state, ventures: state.ventures.map(v => v.id === action.id ? { ...v, ...action.patch } : v) };

    case "ADD_TASK": {
      const existing = state.tasks[action.ventureId] ?? [];
      return { ...state, tasks: { ...state.tasks, [action.ventureId]: [action.task, ...existing] } };
    }

    case "UPDATE_TASK": {
      const existing = state.tasks[action.ventureId] ?? [];
      return { ...state, tasks: { ...state.tasks, [action.ventureId]: existing.map(t => t.id === action.taskId ? { ...t, ...action.patch } : t) } };
    }

    case "ADD_JOIN_REQUEST": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      if (existing.some(r => r.id === action.request.id)) return state;
      return { ...state, joinRequests: { ...state.joinRequests, [action.ventureId]: [...existing, action.request] } };
    }

    case "UPDATE_JOIN_REQUEST_STATUS": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      return { ...state, joinRequests: { ...state.joinRequests, [action.ventureId]: existing.map(r => r.id === action.requestId ? { ...r, status: action.status } : r) } };
    }

    case "REJECT_ALL_PENDING_REQUESTS": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      return { ...state, joinRequests: { ...state.joinRequests, [action.ventureId]: existing.map(r => (!r.status || r.status === "pending") ? { ...r, status: "denied" as const } : r) } };
    }

    case "ADD_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      if (existing.some(m => m.id === action.member.id)) return state;
      return { ...state, members: { ...state.members, [action.ventureId]: [...existing, action.member] } };
    }

    case "REMOVE_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      return { ...state, members: { ...state.members, [action.ventureId]: existing.filter(m => m.id !== action.memberId) } };
    }

    case "UPDATE_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      return { ...state, members: { ...state.members, [action.ventureId]: existing.map(m => m.id === action.memberId ? { ...m, ...action.patch } : m) } };
    }

    case "ADD_VENTURE_TX": {
      const existing = state.ventureTxs[action.ventureId] ?? [];
      return { ...state, ventureTxs: { ...state.ventureTxs, [action.ventureId]: [action.tx, ...existing] } };
    }

    case "RECORD_PLEDGE": {
      const { ventureId, authUsername } = action.pledge;
      const existing = (state.pledges[ventureId] ?? []).filter(p => p.authUsername !== authUsername);
      return { ...state, pledges: { ...state.pledges, [ventureId]: [...existing, action.pledge] } };
    }

    case "REMOVE_PLEDGE": {
      const existing = state.pledges[action.ventureId] ?? [];
      return { ...state, pledges: { ...state.pledges, [action.ventureId]: existing.filter(p => p.authUsername !== action.authUsername) } };
    }

    case "LOAD_LOCAL":
      return { ...state, joinRequests: action.joinRequests, ventureTxs: action.ventureTxs, pledges: action.pledges, loaded: true };

    default:
      return state;
  }
}

// ─── Backend → UI adapter ─────────────────────────────────────────────────────

/** Maps a raw backend venture row to the frontend Venture shape */
function adaptVenture(raw: any, myRole?: string): Venture {
  return {
    id: raw.id,
    name: raw.title,
    location: raw.location ?? "",
    coordinates: { lat: raw.lat ?? 0, lng: raw.lng ?? 0 },
    description: raw.description ?? "",
    status: (raw.status as VentureStatus) ?? "proposed",
    scope: ["clean"],
    category: "Community",
    isFree: (raw.budget ?? 0) === 0,
    budget: raw.budget ?? 0,
    currentFunding: raw.spent ?? 0,
    eac: raw.max_members > 0 ? Math.round((raw.budget ?? 0) / raw.max_members) : 0,
    volunteersJoined: raw.member_count ?? 0,
    volunteersRequired: raw.max_members ?? 20,
    startDate: raw.start_date ?? "",
    endDate: raw.end_date ?? "",
    images: raw.cover_image_url ? [raw.cover_image_url] : [],
    tags: [],
    ownerName: raw.profiles?.full_name ?? raw.profiles?.username ?? "Organiser",
    ownerAvatar: raw.profiles?.avatar_url ?? `https://i.pravatar.cc/150?u=${raw.owner_id}`,
    ownerStats: { completed: 0, rating: 4.5 },
    myRole: myRole ? mapBackendRole(myRole) : undefined,
    myPrivilege: myRole ? mapBackendPrivilege(myRole) : undefined,
  };
}

function mapBackendRole(role: string): UserRole {
  if (role === "owner" || role === "co-organiser") return "contributing_volunteer";
  return "volunteer";
}

function mapBackendPrivilege(role: string): UserPrivilege {
  if (role === "owner") return "co-owner";
  if (role === "co-organiser") return "admin";
  return "viewer";
}

/** Maps a backend member row to the frontend VentureMember shape */
function adaptMember(raw: any): VentureMember {
  const profile = raw.profiles ?? {};
  return {
    id: profile.id ?? raw.user_id ?? Math.random().toString(),
    username: profile.full_name ?? profile.username ?? "Member",
    authUsername: profile.username,
    avatar: profile.avatar_url ?? `https://i.pravatar.cc/150?u=${profile.username ?? "user"}`,
    role: mapBackendRole(raw.role) as UserRole,
    privilege: mapBackendPrivilege(raw.role) as UserPrivilege,
    isOwner: raw.role === "owner",
  };
}

/** Maps a backend task row to the frontend Task shape */
function adaptTask(raw: any): Task {
  return {
    id: raw.id,
    ventureId: raw.venture_id,
    title: raw.title,
    description: raw.description ?? "",
    tag: raw.status === "done" ? "done" : raw.status === "in_progress" ? "in-progress" : "open",
    completed: raw.status === "done",
    dueDate: raw.due_date ?? undefined,
    assignees: raw.assigned_to ? [raw.assigned_to] : [],
    assigneeNames: raw.profiles?.username ? [raw.profiles.username] : [],
    assigneeAvatars: raw.profiles?.avatar_url ? [raw.profiles.avatar_url] : [],
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

type VenturesContextValue = {
  ventures: Venture[];
  tasks: TasksMap;
  joinRequests: JoinRequestsMap;
  members: MembersMap;
  ventureTxs: VentureTxsMap;
  loaded: boolean;
  addVenture: (v: Venture, ownerMember?: VentureMember) => void;
  updateVenture: (id: string, patch: Partial<Venture>) => void;
  updateVentureStatus: (id: string, status: VentureStatus) => void;
  addTask: (ventureId: string, task: Task) => void;
  updateTask: (ventureId: string, taskId: string, patch: Partial<Task>) => void;
  getTasksForVenture: (ventureId: string) => Task[];
  addJoinRequest: (ventureId: string, request: JoinRequest) => void;
  hasRequestedJoin: (ventureId: string, authUsername?: string) => boolean;
  getJoinRequestsForVenture: (ventureId: string) => JoinRequest[];
  updateJoinRequestStatus: (ventureId: string, requestId: string, status: "approved" | "denied") => void;
  rejectAllPendingRequests: (ventureId: string) => void;
  getMembersForVenture: (ventureId: string) => VentureMember[];
  addMember: (ventureId: string, member: VentureMember) => void;
  removeMember: (ventureId: string, memberId: string) => void;
  updateMember: (ventureId: string, memberId: string, patch: Partial<VentureMember>) => void;
  getVentureTxs: (ventureId: string) => Transaction[];
  addVentureTx: (ventureId: string, tx: Transaction) => void;
  getMemberForUser: (ventureId: string, authUsername: string) => VentureMember | null;
  getPledgesForVenture: (ventureId: string) => Pledge[];
  recordPledge: (pledge: Pledge) => void;
  removePledge: (ventureId: string, authUsername: string) => void;
  refreshVentures: () => Promise<void>;
  refreshTasksForVenture: (ventureId: string) => Promise<void>;
};

const VenturesContext = createContext<VenturesContextValue>({
  ventures: [],
  tasks: {},
  joinRequests: {},
  members: {},
  ventureTxs: {},
  loaded: false,
  addVenture: () => {},
  updateVenture: () => {},
  updateVentureStatus: () => {},
  addTask: () => {},
  updateTask: () => {},
  getTasksForVenture: () => [],
  addJoinRequest: () => {},
  hasRequestedJoin: () => false,
  getJoinRequestsForVenture: () => [],
  updateJoinRequestStatus: () => {},
  rejectAllPendingRequests: () => {},
  getMembersForVenture: () => [],
  addMember: () => {},
  removeMember: () => {},
  updateMember: () => {},
  getVentureTxs: () => [],
  addVentureTx: () => {},
  getMemberForUser: () => null,
  getPledgesForVenture: () => [],
  recordPledge: () => {},
  removePledge: () => {},
  refreshVentures: async () => {},
  refreshTasksForVenture: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function VenturesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    ventures: [],
    tasks: {},
    joinRequests: {},
    members: {},
    ventureTxs: {},
    pledges: {},
    loaded: false,
  });

  // Load local-only data (join requests, venture txs, pledges) from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [rawJR, rawTxs, rawPledges] = await Promise.all([
          AsyncStorage.getItem(JOIN_REQUESTS_KEY),
          AsyncStorage.getItem(VENTURE_TXS_KEY),
          AsyncStorage.getItem(PLEDGES_KEY),
        ]);
        dispatch({
          type: "LOAD_LOCAL",
          joinRequests: rawJR ? JSON.parse(rawJR) : {},
          ventureTxs: rawTxs ? JSON.parse(rawTxs) : {},
          pledges: rawPledges ? JSON.parse(rawPledges) : {},
          loaded: true,
        });
      } catch {
        dispatch({ type: "LOAD_LOCAL", joinRequests: {}, ventureTxs: {}, pledges: {}, loaded: true });
      }
    })();
  }, []);

  // Persist local-only data whenever it changes
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify(state.joinRequests)).catch(() => {});
    AsyncStorage.setItem(VENTURE_TXS_KEY, JSON.stringify(state.ventureTxs)).catch(() => {});
    AsyncStorage.setItem(PLEDGES_KEY, JSON.stringify(state.pledges)).catch(() => {});
  }, [state.joinRequests, state.ventureTxs, state.pledges, state.loaded]);

  // Fetch ventures from API whenever user changes
  const fetchVentures = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch "My Ventures" (ventures user is a member of)
      const myRaw: any[] = await api.get("/ventures?mine=true");
      // Fetch all public ventures (Discover)
      const allRaw: any[] = await api.get("/ventures");

      // Build a set of venture IDs the user is a member of
      const myIds = new Set(myRaw.map((r: any) => r.id));

      // Build members map from my ventures (they include my_role)
      const membersMap: MembersMap = {};

      // Adapt my ventures first (with role)
      const myVentures = myRaw.map((raw: any) => {
        const adapted = adaptVenture(raw, raw.my_role);
        // For my ventures, we know the current user's member entry
        membersMap[raw.id] = [{
          id: user.id,
          username: user.displayName,
          authUsername: user.username,
          avatar: user.avatar,
          role: mapBackendRole(raw.my_role),
          privilege: mapBackendPrivilege(raw.my_role),
          isOwner: raw.my_role === "owner",
        }];
        return adapted;
      });

      // Adapt all public ventures (merge, avoid duplicates)
      const discoverVentures = allRaw
        .filter((r: any) => !myIds.has(r.id))
        .map((raw: any) => adaptVenture(raw));

      const allVentures = [...myVentures, ...discoverVentures];

      dispatch({ type: "SET_VENTURES", ventures: allVentures, members: membersMap });
    } catch (err) {
      console.warn("Failed to fetch ventures from API:", err);
      // Keep existing state — don't wipe ventures on network error
    }
  }, [user]);

  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    if (user?.id !== prevUserId.current) {
      prevUserId.current = user?.id ?? null;
      fetchVentures();
    }
  }, [user, fetchVentures]);

  // ─── Callbacks ──────────────────────────────────────────────────────────────

  const addVenture = useCallback(async (v: Venture, ownerMember?: VentureMember) => {
    // Optimistic local add
    dispatch({ type: "ADD_VENTURE", venture: v, ownerMember });
    // Sync to backend
    try {
      const created: any = await api.post("/ventures", {
        title: v.name,
        description: v.description,
        location: v.location,
        lat: v.coordinates?.lat,
        lng: v.coordinates?.lng,
        max_members: v.volunteersRequired ?? 20,
        start_date: v.startDate || undefined,
        end_date: v.endDate || undefined,
        budget: v.budget ?? 0,
        cover_image_url: v.images?.[0] && v.images[0].startsWith("http") ? v.images[0] : undefined,
      });
      // Replace optimistic entry with real backend ID
      if (created?.id && created.id !== v.id) {
        dispatch({ type: "UPDATE_VENTURE", id: v.id, patch: { id: created.id } });
      }
    } catch (err) {
      console.warn("Failed to create venture on backend:", err);
    }
  }, []);

  const updateVenture = useCallback((id: string, patch: Partial<Venture>) => {
    dispatch({ type: "UPDATE_VENTURE", id, patch });
    // Sync to backend (best-effort)
    const backendPatch: any = {};
    if (patch.name) backendPatch.title = patch.name;
    if (patch.description !== undefined) backendPatch.description = patch.description;
    if (patch.location !== undefined) backendPatch.location = patch.location;
    if (patch.status !== undefined) backendPatch.status = patch.status;
    if (patch.budget !== undefined) backendPatch.budget = patch.budget;
    if (Object.keys(backendPatch).length > 0) {
      api.patch(`/ventures/${id}`, backendPatch).catch(() => {});
    }
  }, []);

  const updateVentureStatus = useCallback((id: string, status: VentureStatus) => {
    dispatch({ type: "UPDATE_VENTURE", id, patch: { status } });
    api.patch(`/ventures/${id}`, { status }).catch(() => {});
  }, []);

  const addTask = useCallback(async (ventureId: string, task: Task) => {
    dispatch({ type: "ADD_TASK", ventureId, task });
    try {
      await api.post(`/ventures/${ventureId}/tasks`, {
        title: task.title,
        description: task.description || undefined,
        due_date: task.dueDate || undefined,
      });
    } catch (err) {
      console.warn("Failed to create task on backend:", err);
    }
  }, []);

  const updateTask = useCallback(async (ventureId: string, taskId: string, patch: Partial<Task>) => {
    dispatch({ type: "UPDATE_TASK", ventureId, taskId, patch });
    const backendPatch: any = {};
    if (patch.title !== undefined) backendPatch.title = patch.title;
    if (patch.description !== undefined) backendPatch.description = patch.description;
    if (patch.completed !== undefined) backendPatch.status = patch.completed ? "done" : "open";
    if (patch.dueDate !== undefined) backendPatch.due_date = patch.dueDate;
    if (Object.keys(backendPatch).length > 0) {
      api.patch(`/ventures/${ventureId}/tasks/${taskId}`, backendPatch).catch(() => {});
    }
  }, []);

  const getTasksForVenture = useCallback((ventureId: string): Task[] => {
    return state.tasks[ventureId] ?? [];
  }, [state.tasks]);

  // Fetch tasks for a specific venture from API (called by venture detail screen)
  const fetchTasksForVenture = useCallback(async (ventureId: string) => {
    try {
      const raw: any[] = await api.get(`/ventures/${ventureId}/tasks`);
      const tasks = raw.map(adaptTask);
      dispatch({ type: "SET_TASKS", ventureId, tasks });
    } catch (err) {
      console.warn("Failed to fetch tasks:", err);
    }
  }, []);

  const addJoinRequest = useCallback((ventureId: string, request: JoinRequest) => {
    dispatch({ type: "ADD_JOIN_REQUEST", ventureId, request });
  }, []);

  const hasRequestedJoin = useCallback((ventureId: string, authUsername?: string): boolean => {
    const requests = state.joinRequests[ventureId] ?? [];
    if (authUsername) return requests.some(r => r.authUsername === authUsername && (!r.status || r.status === "pending"));
    return requests.length > 0;
  }, [state.joinRequests]);

  const getJoinRequestsForVenture = useCallback((ventureId: string): JoinRequest[] => {
    return state.joinRequests[ventureId] ?? [];
  }, [state.joinRequests]);

  const updateJoinRequestStatus = useCallback((ventureId: string, requestId: string, status: "approved" | "denied") => {
    dispatch({ type: "UPDATE_JOIN_REQUEST_STATUS", ventureId, requestId, status });
  }, []);

  const rejectAllPendingRequests = useCallback((ventureId: string) => {
    dispatch({ type: "REJECT_ALL_PENDING_REQUESTS", ventureId });
  }, []);

  const getMembersForVenture = useCallback((ventureId: string): VentureMember[] => {
    return state.members[ventureId] ?? [];
  }, [state.members]);

  const addMember = useCallback((ventureId: string, member: VentureMember) => {
    dispatch({ type: "ADD_MEMBER", ventureId, member });
  }, []);

  const removeMember = useCallback((ventureId: string, memberId: string) => {
    dispatch({ type: "REMOVE_MEMBER", ventureId, memberId });
  }, []);

  const updateMember = useCallback((ventureId: string, memberId: string, patch: Partial<VentureMember>) => {
    dispatch({ type: "UPDATE_MEMBER", ventureId, memberId, patch });
  }, []);

  const getVentureTxs = useCallback((ventureId: string): Transaction[] => {
    return state.ventureTxs[ventureId] ?? [];
  }, [state.ventureTxs]);

  const addVentureTx = useCallback((ventureId: string, tx: Transaction) => {
    dispatch({ type: "ADD_VENTURE_TX", ventureId, tx });
  }, []);

  const getMemberForUser = useCallback((ventureId: string, authUsername: string): VentureMember | null => {
    const members = state.members[ventureId] ?? [];
    return members.find(m => m.authUsername === authUsername) ?? null;
  }, [state.members]);

  const getPledgesForVenture = useCallback((ventureId: string): Pledge[] => {
    return state.pledges[ventureId] ?? [];
  }, [state.pledges]);

  const recordPledge = useCallback((pledge: Pledge) => {
    dispatch({ type: "RECORD_PLEDGE", pledge });
  }, []);

  const removePledge = useCallback((ventureId: string, authUsername: string) => {
    dispatch({ type: "REMOVE_PLEDGE", ventureId, authUsername });
  }, []);

  const refreshVentures = useCallback(async () => {
    await fetchVentures();
  }, [fetchVentures]);

  const refreshTasksForVenture = useCallback(async (ventureId: string) => {
    await fetchTasksForVenture(ventureId);
  }, [fetchTasksForVenture]);

  return (
    <VenturesContext.Provider value={{
      ventures: state.ventures,
      tasks: state.tasks,
      joinRequests: state.joinRequests,
      members: state.members,
      ventureTxs: state.ventureTxs,
      loaded: state.loaded,
      addVenture,
      updateVenture,
      updateVentureStatus,
      addTask,
      updateTask,
      getTasksForVenture,
      addJoinRequest,
      hasRequestedJoin,
      getJoinRequestsForVenture,
      updateJoinRequestStatus,
      rejectAllPendingRequests,
      getMembersForVenture,
      addMember,
      removeMember,
      updateMember,
      getVentureTxs,
      addVentureTx,
      getMemberForUser,
      getPledgesForVenture,
      recordPledge,
      removePledge,
      refreshVentures,
      refreshTasksForVenture,
    }}>
      {children}
    </VenturesContext.Provider>
  );
}

export function useVentures() {
  return useContext(VenturesContext);
}
