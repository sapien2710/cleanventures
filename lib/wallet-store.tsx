/**
 * WalletStore — manages per-user wallet balances and transaction histories.
 * Each user (keyed by authUsername) has their own balance and transaction list.
 * Persisted to AsyncStorage so data survives app restarts and user switching.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WALLET_KEY = "@cleanventures:wallet_v2"; // v2 = per-user map

// Starting balances for each demo user
const INITIAL_BALANCES: Record<string, number> = {
  abhijeet: 5000,
  priya: 3500,
  rahul: 2800,
};
const DEFAULT_INITIAL_BALANCE = 1200;

export type WalletTransaction = {
  id: string;
  type: 'topup' | 'deduct';
  amount: number;
  label: string;
  timestamp: string;
};

type UserWallet = {
  balance: number;
  transactions: WalletTransaction[];
};

type WalletMap = Record<string, UserWallet>; // authUsername → UserWallet

type State = {
  wallets: WalletMap;
  loaded: boolean;
};

type Action =
  | { type: "LOAD"; wallets: WalletMap }
  | { type: "TOPUP"; authUsername: string; amount: number; label: string }
  | { type: "DEDUCT"; authUsername: string; amount: number; label?: string };

function getOrCreateWallet(wallets: WalletMap, authUsername: string): UserWallet {
  return wallets[authUsername] ?? {
    balance: INITIAL_BALANCES[authUsername] ?? DEFAULT_INITIAL_BALANCE,
    transactions: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { wallets: action.wallets, loaded: true };

    case "TOPUP": {
      const wallet = getOrCreateWallet(state.wallets, action.authUsername);
      const tx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'topup',
        amount: action.amount,
        label: action.label,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [action.authUsername]: {
            balance: wallet.balance + action.amount,
            transactions: [tx, ...wallet.transactions],
          },
        },
      };
    }

    case "DEDUCT": {
      const wallet = getOrCreateWallet(state.wallets, action.authUsername);
      const tx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'deduct',
        amount: action.amount,
        label: action.label ?? 'Purchase',
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [action.authUsername]: {
            balance: Math.max(0, wallet.balance - action.amount),
            transactions: [tx, ...wallet.transactions],
          },
        },
      };
    }

    default:
      return state;
  }
}

type ContextValue = {
  /** Balance for the given authUsername (defaults to current user if not specified) */
  getBalance: (authUsername: string) => number;
  /** Transactions for the given authUsername */
  getTransactions: (authUsername: string) => WalletTransaction[];
  loaded: boolean;
  topup: (authUsername: string, amount: number, label: string) => void;
  deduct: (authUsername: string, amount: number, label?: string) => void;
  /** Convenience: get balance for a specific user */
  getUserBalance: (authUsername: string) => number;
};

const WalletContext = createContext<ContextValue>({
  getBalance: () => DEFAULT_INITIAL_BALANCE,
  getTransactions: () => [],
  loaded: false,
  topup: () => {},
  deduct: () => {},
  getUserBalance: () => DEFAULT_INITIAL_BALANCE,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    wallets: {},
    loaded: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WALLET_KEY);
        if (raw) {
          const saved: WalletMap = JSON.parse(raw);
          dispatch({ type: "LOAD", wallets: saved });
        } else {
          dispatch({ type: "LOAD", wallets: {} });
        }
      } catch {
        dispatch({ type: "LOAD", wallets: {} });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(WALLET_KEY, JSON.stringify(state.wallets)).catch(() => {});
  }, [state.wallets, state.loaded]);

  const getBalance = useCallback((authUsername: string): number => {
    return getOrCreateWallet(state.wallets, authUsername).balance;
  }, [state.wallets]);

  const getTransactions = useCallback((authUsername: string): WalletTransaction[] => {
    return getOrCreateWallet(state.wallets, authUsername).transactions;
  }, [state.wallets]);

  const getUserBalance = useCallback((authUsername: string): number => {
    return getOrCreateWallet(state.wallets, authUsername).balance;
  }, [state.wallets]);

  const topup = useCallback((authUsername: string, amount: number, label: string) => {
    dispatch({ type: "TOPUP", authUsername, amount, label });
  }, []);

  const deduct = useCallback((authUsername: string, amount: number, label?: string) => {
    dispatch({ type: "DEDUCT", authUsername, amount, label });
  }, []);

  return (
    <WalletContext.Provider value={{ getBalance, getTransactions, loaded: state.loaded, topup, deduct, getUserBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
