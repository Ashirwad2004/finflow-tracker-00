import { create } from 'zustand';

interface AppState {
    userMode: 'business' | 'individual';
    setMode: (mode: 'business' | 'individual') => void;
}

export const useAppStore = create<AppState>((set) => ({
    userMode: 'individual',
    setMode: (mode) => set({ userMode: mode }),
}));
