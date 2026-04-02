import { create } from "zustand";
import type { TodoChange } from "@todo-sync/shared";

interface OfflineQueueState {
  queue: TodoChange[];
  isOnline: boolean;

  addChange: (change: TodoChange) => void;
  clearQueue: () => void;
  setOnline: (online: boolean) => void;
}

const STORAGE_KEY = "todo-sync-offline-queue";

function loadQueue(): TodoChange[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: TodoChange[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export const useOfflineStore = create<OfflineQueueState>((set, get) => ({
  queue: loadQueue(),
  isOnline: navigator.onLine,

  addChange: (change) => {
    const newQueue = [...get().queue, change];
    saveQueue(newQueue);
    set({ queue: newQueue });
  },

  clearQueue: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ queue: [] });
  },

  setOnline: (online) => set({ isOnline: online }),
}));
