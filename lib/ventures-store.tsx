/**
 * VenturesStore — persisted state for ventures, tasks, join requests, members, and venture transactions.
 * Uses AsyncStorage so data survives app restarts.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MOCK_VENTURES, MOCK_TASKS, MOCK_TRANSACTIONS, MOCK_JOIN_REQUESTS, type Venture, type Task, type JoinRequest, type VentureStatus, type UserRole, type UserPrivilege, type Transaction } from "@/lib/mock-data";

const VENTURES_KEY = "@cleanventures:ventures";
const TASKS_KEY = "@cleanventures:tasks";
const JOIN_REQUESTS_KEY = "@cleanventures:join_requests_v2"; // v2 = full request objects
const MEMBERS_KEY = "@cleanventures:members";
const SCHEMA_VERSION_KEY = "@cleanventures:schema_version";
const CURRENT_SCHEMA_VERSION = "v17"; // bump this when seed data changes significantly
const VENTURE_TXS_KEY = "@cleanventures:venture_txs";
const PLEDGES_KEY = "@cleanventures:pledges";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VentureMember = {
  id: string;
  username: string;        // Display name shown in UI
  authUsername?: string;   // Matches AppUser.username for permission lookup
  avatar: string;
  role: UserRole;
  privilege: UserPrivilege | null;
  isOwner?: boolean;
};

type TasksMap = Record<string, Task[]>;                    // ventureId → Task[]
type JoinRequestsMap = Record<string, JoinRequest[]>;      // ventureId → JoinRequest[] (with status)
type MembersMap = Record<string, VentureMember[]>;         // ventureId → VentureMember[]
type VentureTxsMap = Record<string, Transaction[]>;        // ventureId → Transaction[]

export type Pledge = {
  authUsername: string;  // The user who pledged
  displayName: string;   // For display
  amount: number;        // Amount pledged (deducted from wallet on approval)
  ventureId: string;
};
type PledgesMap = Record<string, Pledge[]>; // ventureId → Pledge[]

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
  | { type: "LOAD"; ventures: Venture[]; tasks: TasksMap; joinRequests: JoinRequestsMap; members: MembersMap; ventureTxs: VentureTxsMap; pledges: PledgesMap }
  | { type: "ADD_VENTURE"; venture: Venture; ownerMember?: VentureMember }
  | { type: "UPDATE_VENTURE"; id: string; patch: Partial<Venture> }
  | { type: "ADD_TASK"; ventureId: string; task: Task }
  | { type: "UPDATE_TASK"; ventureId: string; taskId: string; patch: Partial<Task> }
  | { type: "ADD_JOIN_REQUEST"; ventureId: string; request: JoinRequest }
  | { type: "UPDATE_JOIN_REQUEST_STATUS"; ventureId: string; requestId: string; status: 'approved' | 'denied' }
  | { type: "REJECT_ALL_PENDING_REQUESTS"; ventureId: string }
  | { type: "ADD_MEMBER"; ventureId: string; member: VentureMember }
  | { type: "REMOVE_MEMBER"; ventureId: string; memberId: string }
  | { type: "UPDATE_MEMBER"; ventureId: string; memberId: string; patch: Partial<VentureMember> }
  | { type: "ADD_VENTURE_TX"; ventureId: string; tx: Transaction }
  | { type: "RECORD_PLEDGE"; pledge: Pledge }
  | { type: "REMOVE_PLEDGE"; ventureId: string; authUsername: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { ventures: action.ventures, tasks: action.tasks, joinRequests: action.joinRequests, members: action.members, ventureTxs: action.ventureTxs, pledges: action.pledges, loaded: true };

    case "ADD_VENTURE": {
      const newMembers = action.ownerMember
        ? { ...state.members, [action.venture.id]: [action.ownerMember] }
        : state.members;
      return { ...state, ventures: [action.venture, ...state.ventures], members: newMembers };
    }

    case "UPDATE_VENTURE":
      return {
        ...state,
        ventures: state.ventures.map(v =>
          v.id === action.id ? { ...v, ...action.patch } : v
        ),
      };

    case "ADD_TASK": {
      const existing = state.tasks[action.ventureId] ?? [];
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.ventureId]: [action.task, ...existing],
        },
      };
    }

    case "UPDATE_TASK": {
      const existing = state.tasks[action.ventureId] ?? [];
      return {
        ...state,
        tasks: {
          ...state.tasks,
          [action.ventureId]: existing.map(t =>
            t.id === action.taskId ? { ...t, ...action.patch } : t
          ),
        },
      };
    }

    case "ADD_JOIN_REQUEST": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      // Don't add duplicate requests from the same user
      if (existing.some(r => r.id === action.request.id)) return state;
      return {
        ...state,
        joinRequests: {
          ...state.joinRequests,
          [action.ventureId]: [...existing, action.request],
        },
      };
    }

    case "UPDATE_JOIN_REQUEST_STATUS": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      return {
        ...state,
        joinRequests: {
          ...state.joinRequests,
          [action.ventureId]: existing.map(r =>
            r.id === action.requestId ? { ...r, status: action.status } : r
          ),
        },
      };
    }

    case "REJECT_ALL_PENDING_REQUESTS": {
      const existing = state.joinRequests[action.ventureId] ?? [];
      return {
        ...state,
        joinRequests: {
          ...state.joinRequests,
          [action.ventureId]: existing.map(r =>
            (!r.status || r.status === 'pending') ? { ...r, status: 'denied' as const } : r
          ),
        },
      };
    }

    case "ADD_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      if (existing.some(m => m.id === action.member.id)) return state;
      return {
        ...state,
        members: {
          ...state.members,
          [action.ventureId]: [...existing, action.member],
        },
      };
    }

    case "REMOVE_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      return {
        ...state,
        members: {
          ...state.members,
          [action.ventureId]: existing.filter(m => m.id !== action.memberId),
        },
      };
    }

    case "UPDATE_MEMBER": {
      const existing = state.members[action.ventureId] ?? [];
      return {
        ...state,
        members: {
          ...state.members,
          [action.ventureId]: existing.map(m =>
            m.id === action.memberId ? { ...m, ...action.patch } : m
          ),
        },
      };
    }

    case "ADD_VENTURE_TX": {
      const existing = state.ventureTxs[action.ventureId] ?? [];
      return {
        ...state,
        ventureTxs: {
          ...state.ventureTxs,
          [action.ventureId]: [action.tx, ...existing],
        },
      };
    }

    case "RECORD_PLEDGE": {
      const { ventureId, authUsername } = action.pledge;
      const existing = (state.pledges[ventureId] ?? []).filter(p => p.authUsername !== authUsername);
      return {
        ...state,
        pledges: { ...state.pledges, [ventureId]: [...existing, action.pledge] },
      };
    }

    case "REMOVE_PLEDGE": {
      const existing = state.pledges[action.ventureId] ?? [];
      return {
        ...state,
        pledges: { ...state.pledges, [action.ventureId]: existing.filter(p => p.authUsername !== action.authUsername) },
      };
    }

    default:
      return state;
  }
}

// ─── Seed initial members per venture ────────────────────────────────────────

// Role matrix:
//   abhijeet: owner on v1, v3; co-owner on v5, v6; admin on v9; viewer on v2
//   priya:    owner on v2, v8; co-owner on v1; admin on v5, v7; viewer on v3
//   rahul:    owner on v7; co-owner on v9; admin on v1, v3; viewer on v5, v8
function buildInitialMembers(): MembersMap {
  return {
    // v1: abhijeet = owner, priya = co-owner, rahul = admin
    v1: [
      { id: 'owner-v1',       username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'volunteer',              privilege: 'co-owner', isOwner: true },
      { id: 'm-v1-priya',     username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'contributing_volunteer', privilege: 'co-owner' },
      { id: 'm-v1-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'volunteer',              privilege: 'admin' },
      { id: 'm-v1-deepa',     username: 'Deepa N.',                               avatar: 'https://i.pravatar.cc/150?img=25', role: 'volunteer',              privilege: 'viewer' },
    ],
    // v2: priya = owner, abhijeet = viewer, rahul = buyer
    v2: [
      { id: 'owner-v2',       username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'volunteer',              privilege: 'co-owner', isOwner: true },
      { id: 'm-v2-abhijeet',  username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'volunteer',              privilege: 'viewer' },
      { id: 'm-v2-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'contributing_volunteer', privilege: 'buyer' },
      { id: 'm-v2-anita',     username: 'Anita R.',                               avatar: 'https://i.pravatar.cc/150?img=44', role: 'contributing_volunteer', privilege: 'buyer' },
    ],
    // v3: abhijeet = owner, priya = viewer, rahul = admin
    v3: [
      { id: 'owner-v3',       username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'volunteer', privilege: 'co-owner', isOwner: true },
      { id: 'm-v3-priya',     username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'volunteer', privilege: 'viewer' },
      { id: 'm-v3-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'volunteer', privilege: 'admin' },
      { id: 'm-v3-suresh',    username: 'Suresh K.',                              avatar: 'https://i.pravatar.cc/150?img=20', role: 'volunteer', privilege: 'viewer' },
    ],
    // v5: abhijeet = co-owner, priya = admin, rahul = viewer
    v5: [
      { id: 'owner-v5',       username: 'Kiran B.',                               avatar: 'https://i.pravatar.cc/150?img=7',  role: 'volunteer', privilege: 'co-owner', isOwner: true },
      { id: 'm-v5-abhijeet',  username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'sponsor',   privilege: 'co-owner' },
      { id: 'm-v5-priya',     username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'volunteer', privilege: 'admin' },
      { id: 'm-v5-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'volunteer', privilege: 'viewer' },
    ],
    // v6: abhijeet = co-owner
    v6: [
      { id: 'owner-v6',       username: 'Meera K.',                               avatar: 'https://i.pravatar.cc/150?img=9',  role: 'volunteer',              privilege: 'co-owner', isOwner: true },
      { id: 'm-v6-abhijeet',  username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'contributing_volunteer', privilege: 'co-owner' },
      { id: 'm-v6-farhan',    username: 'Farhan A.',                              avatar: 'https://i.pravatar.cc/150?img=15', role: 'volunteer',              privilege: 'viewer' },
    ],
    // v7: rahul = owner, priya = admin
    v7: [
      { id: 'owner-v7',       username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'volunteer', privilege: 'co-owner', isOwner: true },
      { id: 'm-v7-priya',     username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'volunteer', privilege: 'admin' },
      { id: 'm-v7-suresh',    username: 'Suresh P.',                              avatar: 'https://i.pravatar.cc/150?img=60', role: 'volunteer', privilege: 'viewer' },
    ],
    // v8: priya = owner, rahul = viewer
    v8: [
      { id: 'owner-v8',       username: 'Priya M.',    authUsername: 'priya',    avatar: 'https://i.pravatar.cc/150?img=5',  role: 'volunteer',              privilege: 'co-owner', isOwner: true },
      { id: 'm-v8-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'contributing_volunteer', privilege: 'viewer' },
      { id: 'm-v8-farhan',    username: 'Farhan A.',                              avatar: 'https://i.pravatar.cc/150?img=15', role: 'volunteer',              privilege: 'buyer' },
    ],
    // v9: rahul = co-owner, abhijeet = admin
    v9: [
      { id: 'owner-v9',       username: 'Nisha T.',                               avatar: 'https://i.pravatar.cc/150?img=47', role: 'volunteer', privilege: 'co-owner', isOwner: true },
      { id: 'm-v9-rahul',     username: 'Rahul D.',    authUsername: 'rahul',    avatar: 'https://i.pravatar.cc/150?img=33', role: 'volunteer', privilege: 'co-owner' },
      { id: 'm-v9-abhijeet',  username: 'Abhijeet P.', authUsername: 'abhijeet', avatar: 'https://i.pravatar.cc/150?img=11', role: 'volunteer', privilege: 'admin' },
    ],
  };
}

function buildInitialVentureTxs(): VentureTxsMap {
  const map: VentureTxsMap = {};
  MOCK_TRANSACTIONS.forEach(tx => {
    if (!map[tx.ventureId]) map[tx.ventureId] = [];
    map[tx.ventureId].push(tx);
  });
  return map;
}

/** Build initial join requests map from MOCK_JOIN_REQUESTS (all start as pending) */
function buildInitialJoinRequests(): JoinRequestsMap {
  const map: JoinRequestsMap = {};
  MOCK_JOIN_REQUESTS.forEach(req => {
    if (!map[req.ventureId]) map[req.ventureId] = [];
    map[req.ventureId].push({ ...req, status: req.status ?? 'pending' });
  });
  return map;
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = {
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
  /** Add a new join request object (full JoinRequest) */
  addJoinRequest: (ventureId: string, request: JoinRequest) => void;
  /** Check if the current user has a pending/submitted request for a venture */
  hasRequestedJoin: (ventureId: string, authUsername?: string) => boolean;
  /** Get all join requests for a venture */
  getJoinRequestsForVenture: (ventureId: string) => JoinRequest[];
  /** Update the status of a specific join request */
  updateJoinRequestStatus: (ventureId: string, requestId: string, status: 'approved' | 'denied') => void;
  /** Reject all pending requests for a venture (called on venture completion) */
  rejectAllPendingRequests: (ventureId: string) => void;
  getMembersForVenture: (ventureId: string) => VentureMember[];
  addMember: (ventureId: string, member: VentureMember) => void;
  removeMember: (ventureId: string, memberId: string) => void;
  updateMember: (ventureId: string, memberId: string, patch: Partial<VentureMember>) => void;
  getVentureTxs: (ventureId: string) => Transaction[];
  addVentureTx: (ventureId: string, tx: Transaction) => void;
  /** Returns the member record for the given auth username in a venture, or null if not a member */
  getMemberForUser: (ventureId: string, authUsername: string) => VentureMember | null;
  /** All pledges for a venture */
  getPledgesForVenture: (ventureId: string) => Pledge[];
  /** Record a pledge (overwrites existing pledge for same user+venture) */
  recordPledge: (pledge: Pledge) => void;
  /** Remove a pledge (on refund or withdrawal) */
  removePledge: (ventureId: string, authUsername: string) => void;
};

const VenturesContext = createContext<ContextValue>({
  ventures: MOCK_VENTURES,
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
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function VenturesProvider({ children }: { children: React.ReactNode }) {
  const initialTasks: TasksMap = {};
  MOCK_TASKS.forEach(t => {
    if (!initialTasks[t.ventureId]) initialTasks[t.ventureId] = [];
    initialTasks[t.ventureId].push(t);
  });

  const initialMembers = buildInitialMembers();
  const initialVentureTxs = buildInitialVentureTxs();
  const initialJoinRequests = buildInitialJoinRequests();

  const [state, dispatch] = useReducer(reducer, {
    ventures: MOCK_VENTURES,
    tasks: initialTasks,
    joinRequests: initialJoinRequests,
    members: initialMembers,
    ventureTxs: initialVentureTxs,
    pledges: {},
    loaded: false,
  });

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const [rawVentures, rawTasks, rawJoinRequests, rawMembers, rawVentureTxs, rawPledges] = await Promise.all([
          AsyncStorage.getItem(VENTURES_KEY),
          AsyncStorage.getItem(TASKS_KEY),
          AsyncStorage.getItem(JOIN_REQUESTS_KEY),
          AsyncStorage.getItem(MEMBERS_KEY),
          AsyncStorage.getItem(VENTURE_TXS_KEY),
          AsyncStorage.getItem(PLEDGES_KEY),
        ]);

        // Merge ventures
        let ventures = MOCK_VENTURES;
        if (rawVentures) {
          const saved: Venture[] = JSON.parse(rawVentures);
          const savedIds = new Set(saved.map(v => v.id));
          ventures = [...saved, ...MOCK_VENTURES.filter(v => !savedIds.has(v.id))];
        }

        // Merge tasks (saved takes precedence per venture)
        let tasks: TasksMap = { ...initialTasks };
        if (rawTasks) {
          const savedTasks: TasksMap = JSON.parse(rawTasks);
          tasks = { ...initialTasks, ...savedTasks };
        }

        // Merge join requests (saved takes precedence per venture)
        let joinRequests: JoinRequestsMap = { ...initialJoinRequests };
        if (rawJoinRequests) {
          const saved: JoinRequestsMap = JSON.parse(rawJoinRequests);
          joinRequests = { ...initialJoinRequests, ...saved };
        }

        // Check schema version — if outdated, reset members to seed data
        const savedSchemaVersion = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
        const schemaOutdated = savedSchemaVersion !== CURRENT_SCHEMA_VERSION;
        if (schemaOutdated) {
          await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
          await AsyncStorage.removeItem(MEMBERS_KEY);
        }

        // Merge members: additive merge — keep saved members + add any seed members missing from saved
        let members: MembersMap = { ...initialMembers };
        if (rawMembers && !schemaOutdated) {
          const savedMembers: MembersMap = JSON.parse(rawMembers);
          // For each venture, merge saved members but ensure authUsername is set from seed
          // and add any seed members that are missing from the saved list
          const allVentureIds = new Set([...Object.keys(savedMembers), ...Object.keys(initialMembers)]);
          for (const ventureId of allVentureIds) {
            const seedMembers = initialMembers[ventureId] ?? [];
            const saved = savedMembers[ventureId] ?? [];
            // Build a lookup of authUsername from seed by member id
            const seedById = new Map(seedMembers.map(m => [m.id, m]));
            // Backfill authUsername on saved members
            const mergedSaved = saved.map(m => {
              if (!m.authUsername) {
                const seed = seedById.get(m.id);
                if (seed?.authUsername) return { ...m, authUsername: seed.authUsername };
              }
              return m;
            });
            // Add seed members whose id is not in the saved list (e.g., owner records added later)
            const savedIds = new Set(mergedSaved.map(m => m.id));
            const missingSeedMembers = seedMembers.filter(m => !savedIds.has(m.id));
            members[ventureId] = [...mergedSaved, ...missingSeedMembers];
          }
        }

        // Merge venture transactions (saved takes precedence per venture)
        let ventureTxs: VentureTxsMap = { ...initialVentureTxs };
        if (rawVentureTxs) {
          const savedTxs: VentureTxsMap = JSON.parse(rawVentureTxs);
          ventureTxs = { ...initialVentureTxs, ...savedTxs };
        }

        const pledges: PledgesMap = rawPledges ? JSON.parse(rawPledges) : {};

        dispatch({ type: "LOAD", ventures, tasks, joinRequests, members, ventureTxs, pledges });
      } catch {
        dispatch({ type: "LOAD", ventures: MOCK_VENTURES, tasks: initialTasks, joinRequests: initialJoinRequests, members: initialMembers, ventureTxs: initialVentureTxs, pledges: {} });
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever state changes (after initial load)
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(VENTURES_KEY, JSON.stringify(state.ventures)).catch(() => {});
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(state.tasks)).catch(() => {});
    AsyncStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify(state.joinRequests)).catch(() => {});
    AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members)).catch(() => {});
    AsyncStorage.setItem(VENTURE_TXS_KEY, JSON.stringify(state.ventureTxs)).catch(() => {});
    AsyncStorage.setItem(PLEDGES_KEY, JSON.stringify(state.pledges)).catch(() => {});
  }, [state.ventures, state.tasks, state.joinRequests, state.members, state.ventureTxs, state.pledges, state.loaded]);

  const addVenture = useCallback((v: Venture, ownerMember?: VentureMember) => {
    dispatch({ type: "ADD_VENTURE", venture: v, ownerMember });
  }, []);

  const updateVenture = useCallback((id: string, patch: Partial<Venture>) => {
    dispatch({ type: "UPDATE_VENTURE", id, patch });
  }, []);

  const updateVentureStatus = useCallback((id: string, status: VentureStatus) => {
    dispatch({ type: "UPDATE_VENTURE", id, patch: { status } });
  }, []);

  const addTask = useCallback((ventureId: string, task: Task) => {
    dispatch({ type: "ADD_TASK", ventureId, task });
  }, []);

  const updateTask = useCallback((ventureId: string, taskId: string, patch: Partial<Task>) => {
    dispatch({ type: "UPDATE_TASK", ventureId, taskId, patch });
  }, []);

  const getTasksForVenture = useCallback((ventureId: string): Task[] => {
    return state.tasks[ventureId] ?? [];
  }, [state.tasks]);

  const addJoinRequest = useCallback((ventureId: string, request: JoinRequest) => {
    dispatch({ type: "ADD_JOIN_REQUEST", ventureId, request });
  }, []);

  const hasRequestedJoin = useCallback((ventureId: string, authUsername?: string): boolean => {
    const requests = state.joinRequests[ventureId] ?? [];
    if (authUsername) {
      return requests.some(r => r.authUsername === authUsername && (!r.status || r.status === 'pending'));
    }
    return requests.length > 0;
  }, [state.joinRequests]);

  const getJoinRequestsForVenture = useCallback((ventureId: string): JoinRequest[] => {
    return state.joinRequests[ventureId] ?? [];
  }, [state.joinRequests]);

  const updateJoinRequestStatus = useCallback((ventureId: string, requestId: string, status: 'approved' | 'denied') => {
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
    }}>
      {children}
    </VenturesContext.Provider>
  );
}

export function useVentures() {
  return useContext(VenturesContext);
}
