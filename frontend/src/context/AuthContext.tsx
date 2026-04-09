import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  getCurrentUser,
  logout,
  type AuthSession,
} from '../api/authApi';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthSession | null;
  loading: boolean;
  refreshAuth: () => Promise<AuthSession | null>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  loading: true,
  refreshAuth: async () => null,
  logoutUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const session = await getCurrentUser();
      const resolved = session.isAuthenticated ? session : null;
      setUser(resolved);
      return resolved;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logoutUser = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user?.isAuthenticated,
        user,
        loading,
        refreshAuth,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
