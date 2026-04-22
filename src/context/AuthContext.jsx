import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    // Query Supabase directly — RLS lets every user read their own profile row.
    // Agency users also need client_id resolution if they happen to be linked
    // to a client record (typically they are not).
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', userId)
      .single();

    if (profileErr || !profileRow) {
      console.error('Profile lookup failed:', profileErr);
      setProfile(null);
      return;
    }

    let client_id = null;
    if (profileRow.role === 'client') {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();
      client_id = client?.id || null;
    }

    setProfile({ ...profileRow, client_id });
  }

  useEffect(() => {
    // Get initial session. Wait for the profile before clearing loading so
    // RootRedirect/ProtectedRoute don't briefly see profile=null and loop.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
