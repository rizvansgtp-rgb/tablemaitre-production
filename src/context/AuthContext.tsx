import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  switchStore: (storeId: string) => Promise<void>;
  signInDemo?: (email: string, role: string) => Promise<void>;
  signUpDemo?: (email: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const storedUser = localStorage.getItem('table_maitre_demo_user');
      const storedProfile = localStorage.getItem('table_maitre_demo_profile');
      if (storedUser && storedProfile) {
        setUser(JSON.parse(storedUser));
        setProfile(JSON.parse(storedProfile));
        setSession({ 
          access_token: 'mock-token', 
          token_type: 'bearer', 
          expires_in: 3600, 
          refresh_token: 'mock-refresh', 
          user: JSON.parse(storedUser) 
        } as any as Session);
      }
      setLoading(false);
      return;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('[Auth] Initial getSession failed:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId?: string, retryCount = 0) {
    try {
      console.log(`[Auth] fetchProfile called (Attempt ${retryCount + 1})`);
      
      // 1. Wait for supabase.auth.getSession()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] Error getting session in fetchProfile:', sessionError);
      }

      // 2. Confirm session exists before querying profiles
      if (!session || !session.user) {
        console.warn('[Auth] No active session found. Profile query aborted.');
        setProfile(null);
        setLoading(false);
        return;
      }

      const activeUserId = session.user.id;

      // Diagnostic logs
      console.log('[Auth] Diagnostic Logs - Session User ID:', activeUserId);
      console.log('[Auth] Diagnostic Logs - Session Access Token Exists:', Boolean(session.access_token));

      // 3. Query public.profiles where id = session.user.id using maybeSingle()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .maybeSingle();

      // Diagnostic logs
      console.log('[Auth] Diagnostic Logs - Profile Query Response Data:', data);
      if (error) {
        console.error('[Auth] Diagnostic Logs - Profile Query Error Details:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details
        });
      }

      if (error) {
        // Show a clear error if RLS blocks the query
        const isRlsError = error.code === '42501' || error.message?.toLowerCase().includes('permission denied') || error.message?.toLowerCase().includes('policy');
        if (isRlsError) {
          console.error('[Auth] ❌ RLS POLICY BLOCKED QUERY! Access to public.profiles was denied (42501 / Permission Denied / 403). Please verify RLS select policy.');
          alert(`Database Access Error (403): RLS policy blocked profile query.\nCode: ${error.code}\nMessage: ${error.message}`);
        }
        
        setProfile(null);
        setLoading(false);
      } else if (!data) {
        // Profile row not found (clean handle using maybeSingle)
        console.warn(`[Auth] Profile row not found for user ${activeUserId} (Attempt ${retryCount + 1}/6)`);
        if (retryCount < 5) {
          console.log(`[Auth] Profile not found yet, retrying in 1.5s...`);
          setTimeout(() => fetchProfile(activeUserId, retryCount + 1), 1500);
          return;
        }
        setProfile(null);
        setLoading(false);
      } else {
        console.log('[Auth] Profile successfully synchronized:', data);
        setProfile(data);
        setLoading(false);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error in fetchProfile:', err);
      setLoading(false);
    }
  }

  const signInDemo = async (email: string, role: string) => {
    const mockUser = { id: `demo-usr-${Date.now()}`, email } as any as User;
    const mockProfile: Profile = {
      id: mockUser.id,
      email,
      role: role as any,
      assigned_stores: ['0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309'],
      active_store: '0301',
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('table_maitre_demo_user', JSON.stringify(mockUser));
    localStorage.setItem('table_maitre_demo_profile', JSON.stringify(mockProfile));
    
    setUser(mockUser);
    setProfile(mockProfile);
    setSession({ 
      access_token: 'mock-token', 
      token_type: 'bearer', 
      expires_in: 3600, 
      refresh_token: 'mock-refresh', 
      user: mockUser 
    } as any as Session);
  };

  const signUpDemo = async (email: string, role: string) => {
    await signInDemo(email, role);
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem('table_maitre_demo_user');
      localStorage.removeItem('table_maitre_demo_profile');
      setUser(null);
      setProfile(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const switchStore = async (storeId: string) => {
    if (!profile) return;
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({ active_store: storeId })
          .eq('id', profile.id);
        if (error) throw error;
        await fetchProfile(profile.id);
      } else {
        const updatedProfile = { ...profile, active_store: storeId };
        localStorage.setItem('table_maitre_demo_profile', JSON.stringify(updatedProfile));
        setProfile(updatedProfile);
      }
    } catch (err) {
      console.error('[Auth] Error in switchStore:', err);
    }
  };

  const refreshProfile = async () => {
    if (!isSupabaseConfigured) {
      const storedProfile = localStorage.getItem('table_maitre_demo_profile');
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
      return;
    }
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile, switchStore, signInDemo, signUpDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
