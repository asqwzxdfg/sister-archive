'use client';

import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  approved: boolean;
  createdAt?: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isLoading: false }),
}));
