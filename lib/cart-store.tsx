/**
 * CartStore — manages cart items that can be assigned to personal wallet or a venture.
 * Persisted to AsyncStorage within a session.
 */
import React, { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "@cleanventures:cart";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItemType = 'product' | 'service';
export type CartItemStatus = 'pending' | 'purchased';

export interface CartItem {
  id: string;           // unique cart item id
  itemId: string;       // product or service id
  itemType: CartItemType;
  name: string;
  image: string;
  price: number;
  quantity: number;
  ventureId: string | null;  // null = personal cart
  ventureName: string | null;
  status: CartItemStatus;
  addedAt: string;
}

type State = {
  items: CartItem[];
  loaded: boolean;
};

type Action =
  | { type: "LOAD"; items: CartItem[] }
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string }
  | { type: "UPDATE_QTY"; id: string; quantity: number }
  | { type: "CHECKOUT_VENTURE"; ventureId: string }  // marks all venture items as purchased
  | { type: "CHECKOUT_PERSONAL" };                   // marks all personal items as purchased

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD":
      return { items: action.items, loaded: true };

    case "ADD": {
      // If same item+venture already in cart, increment qty instead
      const existing = state.items.find(
        i => i.itemId === action.item.itemId &&
             i.ventureId === action.item.ventureId &&
             i.status === 'pending'
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [action.item, ...state.items] };
    }

    case "REMOVE":
      return { ...state, items: state.items.filter(i => i.id !== action.id) };

    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, quantity: Math.max(1, action.quantity) } : i
        ),
      };

    case "CHECKOUT_VENTURE":
      return {
        ...state,
        items: state.items.map(i =>
          i.ventureId === action.ventureId && i.status === 'pending'
            ? { ...i, status: 'purchased' }
            : i
        ),
      };

    case "CHECKOUT_PERSONAL":
      return {
        ...state,
        items: state.items.map(i =>
          i.ventureId === null && i.status === 'pending'
            ? { ...i, status: 'purchased' }
            : i
        ),
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = {
  items: CartItem[];
  loaded: boolean;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt' | 'status'>) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  checkoutVenture: (ventureId: string) => void;
  checkoutPersonal: () => void;
  getVentureItems: (ventureId: string) => CartItem[];
  getPersonalItems: () => CartItem[];
  pendingCount: number;
};

const CartContext = createContext<ContextValue>({
  items: [],
  loaded: false,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQty: () => {},
  checkoutVenture: () => {},
  checkoutPersonal: () => {},
  getVentureItems: () => [],
  getPersonalItems: () => [],
  pendingCount: 0,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], loaded: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        dispatch({ type: "LOAD", items: raw ? JSON.parse(raw) : [] });
      } catch {
        dispatch({ type: "LOAD", items: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(state.items)).catch(() => {});
  }, [state.items, state.loaded]);

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'addedAt' | 'status'>) => {
    dispatch({
      type: "ADD",
      item: {
        ...item,
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        addedAt: new Date().toISOString(),
        status: 'pending',
      },
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const updateQty = useCallback((id: string, quantity: number) => {
    dispatch({ type: "UPDATE_QTY", id, quantity });
  }, []);

  const checkoutVenture = useCallback((ventureId: string) => {
    dispatch({ type: "CHECKOUT_VENTURE", ventureId });
  }, []);

  const checkoutPersonal = useCallback(() => {
    dispatch({ type: "CHECKOUT_PERSONAL" });
  }, []);

  const getVentureItems = useCallback((ventureId: string): CartItem[] => {
    return state.items.filter(i => i.ventureId === ventureId);
  }, [state.items]);

  const getPersonalItems = useCallback((): CartItem[] => {
    return state.items.filter(i => i.ventureId === null);
  }, [state.items]);

  const pendingCount = state.items.filter(i => i.status === 'pending').length;

  return (
    <CartContext.Provider value={{
      items: state.items,
      loaded: state.loaded,
      addToCart,
      removeFromCart,
      updateQty,
      checkoutVenture,
      checkoutPersonal,
      getVentureItems,
      getPersonalItems,
      pendingCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
