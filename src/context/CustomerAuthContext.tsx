import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { RentalCustomer } from '../types';

interface CustomerAuthContextType {
  firebaseUser: FirebaseUser | null;
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

// Load client Firebase config
const firebaseConfig = {
  projectId: "gen-lang-client-0224683648",
  appId: "1:432276947345:web:1343ef32677a7575cb5a30",
  apiKey: "AIzaSyBfz48JElbtgjXefl1HLGH3KbloTyIH0UQ",
  authDomain: "gen-lang-client-0224683648.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-arc-1ed79364-547a-408d-9326-df4162ee21d6",
  storageBucket: "gen-lang-client-0224683648.firebasestorage.app"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [customer, setCustomer] = useState<RentalCustomer | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or sync customer profile from backend
  const fetchCustomerProfile = useCallback(async (token: string, fbUser?: FirebaseUser | null) => {
    try {
      const res = await fetch('/api/customer/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else if (res.status === 404 && fbUser) {
        // First time customer, create initial profile
        const initRes = await fetch('/api/customer/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName: fbUser.displayName || '',
            googleEmail: fbUser.email || '',
            googleName: fbUser.displayName || '',
            googlePhotoUrl: fbUser.photoURL || ''
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

  // Listen to Firebase client auth changes
  useEffect(() => {
    // Check if dev token exists in sessionStorage
    const devToken = sessionStorage.getItem('arc_customer_dev_token');
    if (devToken) {
      setIdToken(devToken);
      fetchCustomerProfile(devToken).finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setFirebaseUser(user);
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await fetchCustomerProfile(token, user);
        } catch (e) {
          console.error('Failed to get user ID token:', e);
        }
      } else {
        setFirebaseUser(null);
        setCustomer(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchCustomerProfile]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setFirebaseUser(user);
      const token = await user.getIdToken();
      setIdToken(token);
      await fetchCustomerProfile(token, user);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
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
      await signOut(auth);
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
