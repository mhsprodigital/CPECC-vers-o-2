'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

  useEffect(() => {
    // Check local storage for admin session
    const checkAdminSession = () => {
      const storedAdmin = localStorage.getItem('adminSession');
      if (storedAdmin) {
        setAdminUser(JSON.parse(storedAdmin));
      }
    };
    
    checkAdminSession();

    // Supabase Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing in with Password', error);
      return false;
    }
  };

  const signUp = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error signing up', error);
      return false;
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
      
      await supabase.auth.signOut();
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
