import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ModuleKey, ModulePermission } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, pin: string) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (moduleKey: ModuleKey, actionKey?: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'>) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      // Invalid or expired token; clear local storage cleanly
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      removeStoredToken();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (username: string, pin: string): Promise<User> => {
    const res = await api.login({ username, pin });
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network failures on logout
    } finally {
      removeStoredToken();
      setUser(null);
    }
  };

  const hasPermission = (
    moduleKey: ModuleKey,
    actionKey: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'> = 'canView'
  ): boolean => {
    if (!user) return false;
    const roleName = (user.roleName || '').toLowerCase();
    const roleId = (user.roleId || '').toLowerCase();
    const isAdmin = roleName === 'admin' || roleId === 'role_admin' || roleId === 'admin';
    if (isAdmin) return true;

    if (moduleKey === 'audit_logs') {
      return false; // System audit logs are strictly restricted to Admin panel / Admin users
    }

    const perm = user.permissions?.find(p => p.moduleKey === moduleKey);
    return !!(perm && perm[actionKey]);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
