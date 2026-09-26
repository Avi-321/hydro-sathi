/**
 * Client store for cart + wishlist.
 *
 * When a buyer is signed in, everything is persisted server-side through
 * /cart and /cart/wishlist. Guests keep a local cart which is pushed to the
 * server automatically the moment they sign in.
 */
import { useSyncExternalStore } from "react";
import { authApi, useAuth } from "./auth";
import { cartApi } from "./api";
import { tokenStore } from "./http";
import type { CartItem } from "./types";

interface AppState {
  cart: CartItem[];
  wishlist: number[];
  syncing: boolean;
}

const KEY = "hydro-sathi-cart";
const empty: AppState = { cart: [], wishlist: [], syncing: false };

let state: AppState = empty;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify({ cart: state.cart, wishlist: state.wishlist }));
  }
}

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

let loaded = false;
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...JSON.parse(raw) };
  } catch {
    state = empty;
  }
  void refresh();
}

const authed = () => Boolean(tokenStore.access);

/** Pull the authoritative cart/wishlist from the API. */
export async function refresh() {
  if (!authed()) return;
  try {
    const [cart, wishlist] = await Promise.all([cartApi.get(), cartApi.wishlist()]);
    setState({
      cart: cart.items,
      wishlist: wishlist.map((w) => Number((w as Record<string, unknown>)["product_id"])),
    });
  } catch {
    /* offline / not a buyer — keep local state */
  }
}

/** Push a guest cart to the server after sign-in, then reload it. */
export async function syncLocalCart() {
  if (!authed()) return;
  const local = state.cart;
  for (const item of local) {
    try {
      await cartApi.add(item.listingId, item.quantity);
    } catch {
      /* listing may be gone — skip */
    }
  }
  await refresh();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const getServerSnapshot = () => empty;

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Backwards-compatible hook: session user + cart + wishlist in one object. */
export function useAppState() {
  const { user, loading } = useAuth();
  const cart = useCart();
  return { user, loading, cart: cart.cart, wishlist: cart.wishlist };
}

export const actions = {
  async addToCart(item: CartItem) {
    const existing = state.cart.find((c) => c.listingId === item.listingId);
    const cart = existing
      ? state.cart.map((c) =>
          c.listingId === item.listingId
            ? { ...c, quantity: Math.min(c.quantity + item.quantity, c.stockQuantity) }
            : c,
        )
      : [...state.cart, item];
    setState({ cart });
    if (authed()) {
      await cartApi.add(item.listingId, item.quantity);
      await refresh();
    }
  },

  async updateQuantity(listingId: number, quantity: number) {
    setState({
      cart: state.cart.map((c) =>
        c.listingId === listingId ? { ...c, quantity: Math.max(1, Math.min(quantity, c.stockQuantity)) } : c,
      ),
    });
    if (authed()) {
      await cartApi.update(listingId, quantity);
      await refresh();
    }
  },

  async removeFromCart(listingId: number) {
    setState({ cart: state.cart.filter((c) => c.listingId !== listingId) });
    if (authed()) await cartApi.remove(listingId);
  },

  async clearCart() {
    setState({ cart: [] });
    if (authed()) await cartApi.clear();
  },

  async toggleWishlist(productId: number) {
    const has = state.wishlist.includes(productId);
    setState({ wishlist: has ? state.wishlist.filter((id) => id !== productId) : [...state.wishlist, productId] });
    if (authed()) {
      if (has) await cartApi.removeWish(productId);
      else await cartApi.addWish(productId);
    }
  },

  async signOut() {
    await authApi.logout();
    setState({ cart: [], wishlist: [] });
  },
};
