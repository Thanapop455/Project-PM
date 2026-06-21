import { create } from "zustand";

const USER_STORAGE_KEY = "pm_user";
const TOKEN_STORAGE_KEY = "pm_token";

const clearStoredAuth = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

const getStoredUser = () => {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    clearStoredAuth();
    return null;
  }
};

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const useAuthStore = create((set) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),

  login: ({ user, token }) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    clearStoredAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    set({ user });
  },

  loadUserFromStorage: () => {
    const user = getStoredUser();
    const token = getStoredToken();
    set({ user, token, isAuthenticated: Boolean(token) });
  },
}));
