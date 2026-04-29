'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  adminUser: any | null; // Keep for compatibility, but we might base it off user
  loading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  loading: true,
  loginWithGoogle: async () => false,
  logout: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminsList, setAdminsList] = useState<any[]>([]);

  useEffect(() => {
    // Fetch admins from Firestore for admin validation
    const fetchAdmins = async () => {
      try {
        const docRef = doc(db, 'system_config', 'admins');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().admins) {
          setAdminsList(docSnap.data().admins);
        }
      } catch (e) {
        console.error('Error fetching admins:', e);
      }
    };
    fetchAdmins();

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      console.error('Error signing in with Google', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  // Determine if the current user is an admin
  const userEmail = user?.email || '';
  const isAdmin = 
    userEmail === 'mhs.pro.digital@gmail.com' || 
    adminsList.some((admin: any) => admin.email === userEmail);
    
  const adminUser = isAdmin ? { email: userEmail, nome: user?.displayName || 'Admin' } : null;

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, loginWithGoogle, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
