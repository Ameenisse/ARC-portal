import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/firebase';
import { RentalCustomer } from '../types';

export interface CustomerAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface CustomerAuthContextType {
  firebaseUser: CustomerAuthUser | null;
  customer: RentalCustomer | null;
  idToken: string | null;
  loading: boolean;
  isProfileComplete: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutCustomer: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<RentalCustomer>) => Promise<RentalCustomer>;
  previewDevLogin: (testEmail?: string, testName?: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<CustomerAuthUser | null>(null);
  const [customer, setCustomer] = useState<RentalCustomer | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomerProfile = useCallback(async (token: string, authUser?: CustomerAuthUser | null) => {
    try {
      const res = await fetch('/api/customer/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else if (res.status === 404 && authUser) {
        const initRes = await fetch('/api/customer/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName: authUser.displayName || '',
            googleEmail: authUser.email || '',
            googleName: authUser.displayName || '',
            googlePhotoUrl: authUser.photoURL || ''
          })
        });
        if (initRes.ok) {
          const created = await initRes.json();
          setCustomer(created);
        }
      }
    } catch (err) {
      console.warn('Could not load customer profile:', err);
    }
  }, []);

  useEffect(() => {
    const devToken = sessionStorage.getItem('arc_customer_dev_token');
    if (devToken) {
      setIdToken(devToken);
      fetchCustomerProfile(devToken).finally(() => setLoading(false));
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const mappedUser: CustomerAuthUser = {
          uid: u.id,
          email: u.email || null,
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
          photoURL: u.user_metadata?.avatar_url || u.user_metadata?.picture || null
        };
        setFirebaseUser(mappedUser);
        setIdToken(session.access_token);
        await fetchCustomerProfile(session.access_token, mappedUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const mappedUser: CustomerAuthUser = {
          uid: u.id,
          email: u.email || null,
          displayName: u.user_metadata?.full_name || u.user_metadata?.name || u.email || null,
          photoURL: u.user_metadata?.avatar_url || u.user_metadata?.picture || null
        };
        setFirebaseUser(mappedUser);
        setIdToken(session.access_token);
        await fetchCustomerProfile(session.access_token, mappedUser);
      } else if (!sessionStorage.getItem('arc_customer_dev_token')) {
        setFirebaseUser(null);
        setCustomer(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchCustomerProfile]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/rental'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Supabase Google Sign In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const previewDevLogin = async (testEmail = 'customer.demo@arc.mv', testName = 'Demo Customer') => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/dev-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, name: testName })
      });
      if (!res.ok) throw new Error('Dev customer login failed');
      const data = await res.json();
      sessionStorage.setItem('arc_customer_dev_token', data.token);
      setIdToken(data.token);
      setCustomer(data.customer);
    } finally {
      setLoading(false);
    }
  };

  const signOutCustomer = async () => {
    sessionStorage.removeItem('arc_customer_dev_token');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setFirebaseUser(null);
    setCustomer(null);
    setIdToken(null);
  };

  const refreshProfile = async () => {
    if (!idToken) return;
    await fetchCustomerProfile(idToken, firebaseUser);
  };

  const updateProfile = async (data: Partial<RentalCustomer>): Promise<RentalCustomer> => {
    if (!idToken) throw new Error('Not authenticated');
    const res = await fetch('/api/customer/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update profile');
    }
    const updated = await res.json();
    setCustomer(updated);
    return updated;
  };

  const isProfileComplete = Boolean(
    customer?.fullName &&
    customer?.phoneNumber &&
    customer?.idCardNumber
  );

  return (
    <CustomerAuthContext.Provider
      value={{
        firebaseUser,
        customer,
        idToken,
        loading,
        isProfileComplete,
        signInWithGoogle,
        signOutCustomer,
        refreshProfile,
        updateProfile,
        previewDevLogin
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
