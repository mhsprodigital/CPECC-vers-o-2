'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  adminUser: any | null;
  loading: boolean;
  signInWithPassword: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginAdmin: (username: string, pass: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  loading: true,
  signInWithPassword: async () => false,
  signUp: async () => false,
  logout: async () => {},
  loginAdmin: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminsList, setAdminsList] = useState<any[]>([]);

  useEffect(() => {
    // Check local storage for admin session
    const checkAdminSession = () => {
      const storedAdmin = localStorage.getItem('adminSession');
      if (storedAdmin) {
        setAdminUser(JSON.parse(storedAdmin));
      }
    };
    
    checkAdminSession();

    // Fetch admins from Firestore for login validation
    const fetchAdmins = async () => {
      try {
        const docRef = doc(db, 'system_config', 'admins');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().admins) {
          setAdminsList(docSnap.data().admins);
        }
      } catch (e) {
        console.error('Error fetching admins for login:', e);
      }
    };
    fetchAdmins();

    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error('Error signing in with Password', error);
      return false;
    }
  };

  const signUp = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error('Error signing up', error);
      return false;
    }
  };

  const loginAdmin = (username: string, pass: string) => {
    const admins = adminsList.length > 0 ? adminsList : JSON.parse(localStorage.getItem('admins') || '[]');
    const admin = admins.find((a: any) => a.username === username && a.password === pass);
    if (admin) {
      setAdminUser(admin);
      localStorage.setItem('adminSession', JSON.stringify(admin));
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      if (adminUser) {
        setAdminUser(null);
        localStorage.removeItem('adminSession');
      }
      
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, signInWithPassword, signUp, logout, loginAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
