import { create } from 'zustand';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'master_admin' | 'admin' | 'user';
  adminId?: string;
}

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserSession, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (name: string, phone?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe SSR initial state load
  const isClient = typeof window !== 'undefined';
  const storedUser = isClient ? localStorage.getItem('rw_user') : null;
  const storedAccess = isClient ? localStorage.getItem('rw_access') : null;
  const storedRefresh = isClient ? localStorage.getItem('rw_refresh') : null;

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    accessToken: storedAccess,
    refreshToken: storedRefresh,
    isAuthenticated: !!storedAccess,

    login: (user, accessToken, refreshToken) => {
      if (isClient) {
        localStorage.setItem('rw_user', JSON.stringify(user));
        localStorage.setItem('rw_access', accessToken);
        localStorage.setItem('rw_refresh', refreshToken);
      }
      set({ user, accessToken, refreshToken, isAuthenticated: true });
    },

    logout: () => {
      if (isClient) {
        localStorage.removeItem('rw_user');
        localStorage.removeItem('rw_access');
        localStorage.removeItem('rw_refresh');
      }
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    },

    updateUser: (name, phone) => {
      set((state) => {
        if (!state.user) return state;
        const updatedUser = { ...state.user, name, phone };
        if (isClient) {
          localStorage.setItem('rw_user', JSON.stringify(updatedUser));
        }
        return { user: updatedUser };
      });
    }
  };
});

export default useAuthStore;
