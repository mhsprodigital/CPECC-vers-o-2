'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  adminUser: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loginAdmin: (username: string, pass: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  loginAdmin: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for admin session
    const checkAdminSession = () => {
      const storedAdmin = localStorage.getItem('adminSession');
      if (storedAdmin) {
        setAdminUser(JSON.parse(storedAdmin));
      }
    };
    
    // Check local storage for mock Google session
    const checkMockGoogleSession = () => {
      const storedUser = localStorage.getItem('mockGoogleSession');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };
    
    checkAdminSession();
    checkMockGoogleSession();

    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (error) {
      console.warn('Firebase auth not configured properly, using mock auth.', error);
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Mock Google Login since Firebase is not configured
      const mockUser = {
        uid: 'mock-google-uid-123',
        email: 'pesquisador@example.com',
        displayName: 'Pesquisador Teste',
        photoURL: 'https://picsum.photos/seed/pesquisador/200/200',
      } as User;
      
      setUser(mockUser);
      localStorage.setItem('mockGoogleSession', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };

  const loginAdmin = (username: string, pass: string) => {
    const admins = JSON.parse(localStorage.getItem('admins') || '[]');
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
      
      const storedUser = localStorage.getItem('mockGoogleSession');
      if (storedUser) {
        setUser(null);
        localStorage.removeItem('mockGoogleSession');
      }

      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, signInWithGoogle, logout, loginAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
