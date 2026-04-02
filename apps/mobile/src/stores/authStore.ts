import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@todo-sync/shared";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  init: () => Promise<void>;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  init: async () => {
    const token = await AsyncStorage.getItem("accessToken");
    set({
      accessToken: token,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },

  login: async (user, accessToken, refreshToken) => {
    await AsyncStorage.setItem("accessToken", accessToken);
    await AsyncStorage.setItem("refreshToken", refreshToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
