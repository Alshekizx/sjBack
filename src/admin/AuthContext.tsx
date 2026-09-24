import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, type AdminUser, type AdminRole } from '../lib/supabase';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (required: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 5,
  admin: 4,
  content_manager: 3,
  page_manager: 2,
  support_manager: 1,
};

const toAdminUser = (authUser: any): AdminUser | null => {
  const role = authUser.app_metadata?.role;
  if (!['super_admin', 'admin', 'content_manager', 'page_manager', 'support_manager'].includes(role)) return null;
  return {
    id: authUser.id, email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Administrator',
    role, is_active: true, created_at: authUser.created_at,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ? toAdminUser(data.session.user) : null)).catch(() => setUser(null)).finally(() => setLoading(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ? toAdminUser(session.user) : null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const adminUser = toAdminUser(data.user);
    if (!adminUser) { await supabase.auth.signOut(); return { error: 'This account is not assigned an administrator role.' }; }
    setUser(adminUser);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasPermission = (required: AdminRole[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return required.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
